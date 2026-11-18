import type { Request, Response } from "express";
import * as oauth from "oauth4webapi";
import { describe, expect, it } from "vitest";
import { currentUrl, isStaleCode, restartSignIn } from "./oauth2-callback.js";

/**
 * The callback URL openid-client is asked to validate.
 *
 * IDAM reports two different issuers and openid-client checks both against the single
 * configured one, so no value satisfies them together:
 *
 *   the `iss` query parameter on the callback → https://idam-web-public.aat.platform.hmcts.net/o
 *   the `iss` claim inside the id_token       → https://forgerock-am.…internal:8443/openam/…
 *
 * The client is configured with the signed one (`reconcileIssuer` in `libs/oidc/client.ts`),
 * so the query parameter has to be dropped or every sign-in dies in `validateAuthResponse`
 * with "invalid response encountered" — before a token request is even made.
 */

function request(originalUrl: string): Request {
  return { protocol: "https", originalUrl, get: () => "send.example.gov.uk" } as unknown as Request;
}

const PUBLIC_ISSUER = "https://idam-web-public.aat.platform.hmcts.net/o";
const SIGNED_ISSUER = "https://forgerock-am.service.core-compute-idam-aat2.internal:8443/openam/oauth2/realms/root/realms/hmcts";

describe("currentUrl", () => {
  it("should drop the iss parameter IDAM sends, keeping everything else", () => {
    const url = currentUrl(request(`/oauth2-callback?code=abc123&iss=${encodeURIComponent(PUBLIC_ISSUER)}&client_id=sptribs-frontend`));

    expect(url.searchParams.get("iss")).toBeNull();
    expect(url.searchParams.get("code"), "the code must survive — it is what gets exchanged").toBe("abc123");
    expect(url.searchParams.get("client_id")).toBe("sptribs-frontend");
    expect(url.pathname).toBe("/oauth2-callback");
  });

  it("should produce a callback openid-client accepts against the signed issuer", () => {
    // The real check, run against oauth4webapi rather than asserted by hand: this is the
    // function that rejected every AAT sign-in, and it fails on the untouched URL.
    const server = { issuer: SIGNED_ISSUER } as oauth.AuthorizationServer;
    const oauthClient = { client_id: "sptribs-frontend" } as oauth.Client;
    const raw = `/oauth2-callback?code=abc123&iss=${encodeURIComponent(PUBLIC_ISSUER)}&client_id=sptribs-frontend`;

    expect(() => oauth.validateAuthResponse(server, oauthClient, currentUrl(request(raw)).searchParams)).not.toThrow();

    // And the untouched URL is what fails, so the deletion is doing the work.
    const untouched = new URL(raw, "https://send.example.gov.uk");
    expect(() => oauth.validateAuthResponse(server, oauthClient, untouched.searchParams)).toThrow(/iss/);
  });
});

/**
 * Recovering from an authorization code that is no longer usable.
 *
 * A code is single-use and short-lived, so pressing Back after signing in — or reopening the
 * callback URL — replays a spent one. IDAM answers `invalid_grant`, and before this the page
 * that came back was "Sorry, there is a problem with the service", which is both alarming and
 * wrong: nothing is broken and a new code fixes it.
 */
interface FakeSession {
  oidcCodeVerifier?: string;
  oidcNonce?: string;
  oidcRestarts?: number;
  returnTo?: string;
  save: (cb: (err?: Error) => void) => void;
}

function sessionRequest(session: Partial<FakeSession> = {}): { req: Request; session: FakeSession } {
  const fake: FakeSession = {
    save: (cb) => cb(),
    ...session
  };
  return { req: { session: fake } as unknown as Request, session: fake };
}

function recordingResponse(): { res: Response; redirects: { status: number; to: string }[] } {
  const redirects: { status: number; to: string }[] = [];
  const res = { redirect: (status: number, to: string) => redirects.push({ status, to }) } as unknown as Response;
  return { res, redirects };
}

describe("isStaleCode", () => {
  it("should recognise invalid_grant on the error itself", () => {
    expect(isStaleCode({ error: "invalid_grant", error_description: "The provided access grant is invalid, expired, or revoked." })).toBe(true);
  });

  it("should recognise invalid_grant behind the wrapper exchangeCode throws", () => {
    // exchangeCode re-throws as `new Error(..., { cause })`, so the reason moves onto cause.
    const wrapped = new Error("IDAM token exchange failed: invalid_grant", { cause: { error: "invalid_grant" } });
    expect(isStaleCode(wrapped)).toBe(true);
  });

  it("should not treat other failures as recoverable", () => {
    // invalid_client is a misconfiguration: restarting would loop the browser forever
    // instead of surfacing it.
    expect(isStaleCode({ error: "invalid_client" })).toBe(false);
    expect(isStaleCode(new Error("unexpected JWT claim value encountered"))).toBe(false);
    expect(isStaleCode(undefined)).toBe(false);
  });
});

describe("restartSignIn", () => {
  it("should send the browser back to sign in", async () => {
    const { req, session } = sessionRequest({ oidcCodeVerifier: "spent", oidcNonce: "n" });
    const { res, redirects } = recordingResponse();

    await restartSignIn(req, res);

    expect(redirects).toEqual([{ status: 302, to: "/login" }]);
    // The stale handshake state has to go, or /login's fresh code meets the old verifier.
    expect(session.oidcCodeVerifier).toBeUndefined();
    expect(session.oidcNonce).toBeUndefined();
  });

  it("should keep where the citizen was heading", async () => {
    const { req } = sessionRequest({ returnTo: "/appeal/child-name" });
    const { res, redirects } = recordingResponse();

    await restartSignIn(req, res);

    expect(redirects[0].to).toBe("/login?returnTo=%2Fappeal%2Fchild-name");
  });

  it("should refuse to restart twice, rather than looping the browser", async () => {
    // The second restart means the first did not fix it, so this is not a stale code and
    // redirecting again would bounce between /login and /oauth2-callback indefinitely.
    const { req, session } = sessionRequest({ oidcRestarts: 1 });
    const { res, redirects } = recordingResponse();

    await expect(restartSignIn(req, res)).rejects.toThrow(/could not be completed/i);
    expect(redirects).toEqual([]);
    expect(session.oidcRestarts).toBeUndefined();
  });
});
