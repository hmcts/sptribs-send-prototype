import config from "config";
import type { Request, Response } from "express";
import * as client from "openid-client";
import { getOidcClient } from "#oidc";

/**
 * Single-step logout: destroy the local session and forward the browser
 * to IDAM's `/o/endSession`. IDAM then redirects back to
 * `/logged-out`. Honours either GET or POST so any sign-out trigger
 * (XUI's tactical button or our own forms) works.
 *
 * When pointed at the local rse-idam-simulator the endSession endpoint
 * is advertised in discovery but returns 404 — skip the chain and land
 * the user on /logged-out directly.
 */
const handler = (req: Request, res: Response) => {
  const idToken = req.session.user?.idToken;

  const callback = currentOrigin(req);
  const target = simulatorMode() ? `${callback}/logged-out` : buildEndSessionUrl(callback, idToken);

  req.session.destroy(() => {
    res.redirect(302, target);
  });
};

export const GET = handler;
export const POST = handler;

function buildEndSessionUrl(callback: string, idToken: string | undefined): string {
  const oidc = getOidcClient();
  return client.buildEndSessionUrl(oidc, {
    post_logout_redirect_uri: `${callback}/logged-out`,
    ...(idToken ? { id_token_hint: idToken } : {})
  }).href;
}

function simulatorMode(): boolean {
  // The local rse-idam-simulator serves plain http (localhost or the
  // docker-network name idam-simulator); real IDAM is always https.
  const issuer = new URL(config.get<string>("idam.issuer"));
  return issuer.protocol === "http:";
}

function currentOrigin(req: Request): string {
  return `${req.protocol}://${req.get("host")}`;
}
