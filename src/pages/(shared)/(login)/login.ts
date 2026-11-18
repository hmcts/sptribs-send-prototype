import type { Request, Response } from "express";
import * as client from "openid-client";
import { getOidcClient, oidcRedirectUri, oidcScope, saveSession } from "#oidc";

/**
 * Kick off the OIDC authorization-code flow with PKCE. Stores the
 * `returnTo` plus PKCE/nonce state on the session, then redirects the
 * browser to the IDAM authorize endpoint. The handshake completes at
 * `/oauth2-callback`.
 */
export const GET = async (req: Request, res: Response) => {
  const session = req.session;
  const oidc = getOidcClient();

  const returnTo = stringParam(req.query.returnTo);
  if (returnTo && isSafeReturnTo(returnTo)) {
    session.returnTo = returnTo;
  }

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  session.oidcCodeVerifier = codeVerifier;

  const parameters: Record<string, string> = {
    redirect_uri: oidcRedirectUri(),
    scope: oidcScope(),
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  };

  // IDAM simulator advertises PKCE; nonce is only required when it does not.
  if (!oidc.serverMetadata().supportsPKCE()) {
    const nonce = client.randomNonce();
    session.oidcNonce = nonce;
    parameters.nonce = nonce;
  }

  const authorizeUrl = client.buildAuthorizationUrl(oidc, parameters);

  // Persist the PKCE/nonce state before redirecting — /oauth2-callback reads it
  // back. A save failure throws to the global errorHandler.
  await saveSession(session);
  res.redirect(302, authorizeUrl.href);
};

export function isSafeReturnTo(value: string | undefined): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  if (!value.startsWith("/")) {
    return false;
  }
  if (value.startsWith("//")) {
    return false;
  }
  if (value.startsWith("/\\")) {
    return false;
  }
  return true;
}

function stringParam(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return undefined;
}
