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

  const tokens = await client.authorizationCodeGrant(oidc, currentUrl(req), checks);
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
