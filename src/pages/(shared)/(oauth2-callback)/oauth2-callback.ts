import type { Request, Response } from "express";
import * as client from "openid-client";
import { deriveUserType, getOidcClient, landingPage, type SendUser, saveSession } from "#oidc";

/**
 * OIDC authorization-code callback. Exchanges the `code` for tokens,
 * fetches the user profile, derives the canonical user type from IDAM
 * roles, persists everything on the session, and lands the user back on
 * `returnTo` (or their user type's landing page).
 */
// Any failure here (token exchange, userinfo) throws and is caught by the
// global errorHandler, which logs it and renders errors/500. No per-step catch.
export const GET = async (req: Request, res: Response) => {
  const session = req.session;
  const oidc = getOidcClient();

  const verifier = session.oidcCodeVerifier;
  if (!verifier) {
    // No PKCE state: the callback was reached without starting sign-in — a bookmark, or a
    // session that expired mid-handshake. Start the flow rather than explaining it.
    return restartSignIn(req, res);
  }

  const checks: Parameters<typeof client.authorizationCodeGrant>[2] = { pkceCodeVerifier: verifier, idTokenExpected: true };
  if (session.oidcNonce) {
    checks.expectedNonce = session.oidcNonce;
  }

  let tokens: Awaited<ReturnType<typeof client.authorizationCodeGrant>>;
  try {
    tokens = await exchangeCode(oidc, currentUrl(req), checks);
  } catch (error) {
    // An authorization code is single-use and short-lived, so `invalid_grant` means this one
    // has already been redeemed or has expired — which is what the browser Back button does
    // after a successful sign-in, and what re-opening the callback URL does. It is not a
    // service fault, and "Sorry, there is a problem with the service" is the wrong answer:
    // send them back through sign-in for a fresh code.
    if (isStaleCode(error)) {
      return restartSignIn(req, res);
    }
    throw error;
  }
  const { access_token, id_token, refresh_token } = tokens;
  const claims = tokens.claims();
  if (!claims || typeof claims.sub !== "string") {
    throw new Error("IDAM response has no sub claim");
  }

  const userInfo = await client.fetchUserInfo(oidc, access_token, claims.sub);
  const idamRoles = readRoles(userInfo, claims);
  const userType = deriveUserType(idamRoles);

  const user: SendUser = {
    sub: claims.sub,
    uid: typeof userInfo.uid === "string" ? userInfo.uid : claims.sub,
    email: typeof userInfo.email === "string" ? userInfo.email : "",
    name: typeof userInfo.name === "string" ? userInfo.name : ((userInfo.email as string) ?? "Unknown"),
    userType,
    idamRoles,
    accessToken: access_token,
    idToken: (id_token as string) ?? "",
    refreshToken: (refresh_token as string) ?? ""
  };

  session.user = user;
  const returnTo = session.returnTo;
  session.returnTo = undefined;
  session.oidcCodeVerifier = undefined;
  session.oidcNonce = undefined;
  // Cleared on success, so a stale code later in the session still gets its one retry.
  session.oidcRestarts = undefined;

  // Persist before redirecting: express-session only writes at end-of-response,
  // and a 302 can be followed before that write lands in Redis, which would
  // present the next request as anonymous and bounce the user back to /login.
  await saveSession(session);

  res.redirect(302, returnTo ?? landingPage(userType));
};

/**
 * Exchange the code, and say what IDAM actually objected to if it refuses.
 *
 * openid-client throws `ResponseBodyError` for an OAuth error response, and the reason —
 * `invalid_client`, `invalid_grant`, `redirect_uri_mismatch` — is on the error object, not in
 * the stack. The starter's errorHandler logs `err.stack`, so without this the pod log reads
 *
 *     Error: ResponseBodyError: server responded with an error in the response body
 *         at checkOAuthBodyError (...)
 *
 * and nothing else: a sign-in that fails for a nameable, fixable reason, reported as an
 * anonymous 500. It cost an afternoon once, on a missing client_secret.
 *
 * The description is logged, not rendered: it is IDAM's own wording and may name the client.
 */
async function exchangeCode(
  oidc: client.Configuration,
  url: URL,
  checks: Parameters<typeof client.authorizationCodeGrant>[2]
): Promise<Awaited<ReturnType<typeof client.authorizationCodeGrant>>> {
  try {
    return await client.authorizationCodeGrant(oidc, url, checks);
  } catch (caught) {
    const oauthError = caught as { error?: string; error_description?: string };
    if (oauthError?.error) {
      console.error(`IDAM rejected the token exchange: ${oauthError.error} — ${oauthError.error_description ?? "no description"}`);
      throw new Error(`IDAM token exchange failed: ${oauthError.error}`, { cause: caught });
    }

    // A failed claim check is just as anonymous. openid-client collapses every claim
    // comparison into the one message "unexpected JWT claim value encountered" and puts the
    // claim, the expected value and the actual value on `err.cause` — which the errorHandler
    // never prints, so the log names neither the claim nor the mismatch.
    const detail = claimMismatch(caught);
    if (detail) {
      console.error(`IDAM's id_token failed validation: ${detail}`);
      throw new Error(`IDAM id_token rejected: ${detail}`, { cause: caught });
    }

    throw caught;
  }
}

/**
 * Whether a token-exchange failure means "this code is no longer usable".
 *
 * `invalid_grant` is IDAM's answer for a code that has been redeemed already, has expired, or
 * was issued for a different redirect URI. All three are recoverable by asking for a new one.
 */
export function isStaleCode(error: unknown): boolean {
  const oauthError = error as { error?: string; cause?: { error?: string } };
  return oauthError?.error === "invalid_grant" || oauthError?.cause?.error === "invalid_grant";
}

/**
 * Send the user back through sign-in, preserving where they were heading.
 *
 * Guarded with a counter, because the failure this recovers from and a genuinely broken
 * handshake are indistinguishable from here: without the guard, a real fault would bounce the
 * browser between `/login` and `/oauth2-callback` indefinitely instead of reporting anything.
 * One retry is enough — a stale code succeeds on the next attempt by definition.
 */
export async function restartSignIn(req: Request, res: Response): Promise<void> {
  const session = req.session;
  const attempts = (session.oidcRestarts ?? 0) + 1;

  session.oidcCodeVerifier = undefined;
  session.oidcNonce = undefined;

  if (attempts > 1) {
    session.oidcRestarts = undefined;
    await saveSession(session);
    console.error("Sign-in restarted twice without completing; not redirecting again");
    throw new Error("Sign-in could not be completed after restarting");
  }

  session.oidcRestarts = attempts;
  const returnTo = session.returnTo;
  await saveSession(session);

  res.redirect(302, returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login");
}

/** The claim, and the two values, out of an openid-client claim-comparison failure. */
function claimMismatch(caught: unknown): string | undefined {
  const cause = (caught as { cause?: unknown }).cause as { claim?: string; expected?: unknown; claims?: Record<string, unknown>; message?: string } | undefined;
  if (!cause?.claim) {
    return undefined;
  }
  const actual = cause.claims?.[cause.claim];
  return `${cause.claim} was ${JSON.stringify(actual)}, expected ${JSON.stringify(cause.expected)}`;
}

export function currentUrl(req: Request): URL {
  const protocol = req.protocol;
  const host = req.get("host");
  const url = new URL(req.originalUrl, `${protocol}://${host}`);

  // IDAM reports two different issuers, and openid-client validates both against the one
  // configured issuer — so no single value can satisfy them:
  //
  //   the `iss` query parameter here  → https://idam-web-public.aat.platform.hmcts.net/o
  //   the `iss` claim in the id_token → https://forgerock-am.…internal:8443/openam/…
  //
  // The client is configured with the second (see reconcileIssuer), because that is the one
  // signed into every token. This one then fails `validateAuthResponse` with the anonymous
  // "invalid response encountered", before any token request is made.
  //
  // Dropping this parameter rather than the claim check is the safe side of the trade. This is
  // an unsigned URL parameter — anyone who can craft the callback can set it — and its purpose
  // (RFC 9207) is to stop a mix-up between *several* issuers, which cannot arise here: exactly
  // one is configured, and openid-client is not asked to discover it from the response. The
  // id_token's `iss` is signed, verified against the JWKS, and still enforced.
  //
  // IDAM does not advertise `authorization_response_iss_parameter_supported`, so openid-client
  // does not require the parameter to be present — it only objects to it disagreeing.
  url.searchParams.delete("iss");
  return url;
}

function readRoles(userInfo: client.UserInfoResponse, claims: Record<string, unknown>): string[] {
  const fromInfo = (userInfo as { roles?: unknown }).roles;
  if (Array.isArray(fromInfo) && fromInfo.every((r) => typeof r === "string")) {
    return fromInfo;
  }
  const fromClaim = claims.roles;
  if (Array.isArray(fromClaim) && fromClaim.every((r) => typeof r === "string")) {
    return fromClaim;
  }
  if (typeof fromClaim === "string") {
    return [fromClaim];
  }
  return [];
}
