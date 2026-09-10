import type { Request } from "express";
import * as oauth from "oauth4webapi";
import { describe, expect, it } from "vitest";
import { currentUrl } from "./oauth2-callback.js";

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
