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
    return res.status(400).send("Missing PKCE state — restart the sign-in flow");
  }

  const checks: Parameters<typeof client.authorizationCodeGrant>[2] = { pkceCodeVerifier: verifier, idTokenExpected: true };
  if (session.oidcNonce) {
    checks.expectedNonce = session.oidcNonce;
  }

  const tokens = await exchangeCode(oidc, currentUrl(req), checks);
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
    throw caught;
  }
}

function currentUrl(req: Request): URL {
  const protocol = req.protocol;
  const host = req.get("host");
  return new URL(req.originalUrl, `${protocol}://${host}`);
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
