import config from "config";
import { authenticator } from "otplib";
import { CcdError } from "./ccd-error.js";
import type { HttpClient } from "./http.js";

/**
 * A service-to-service token for the CCD data store.
 *
 * CCD requires two credentials on every write: the citizen's IDAM bearer token,
 * which says who is acting, and an S2S token, which says which service is asking.
 * The S2S token is minted from a shared TOTP secret via
 * `POST /lease` on `rpe-service-auth-provider`.
 *
 * Cached until shortly before it expires. S2S leases last minutes, and minting one
 * per submission would put a second network hop — and a second failure mode — in
 * front of every citizen pressing Pay.
 *
 * Errors are not swallowed. `sptribs-dss-update-case-web` returns `''` on failure,
 * which turns a credential problem into an opaque CCD 403 further down; here it
 * surfaces as a `CcdError` the page can turn into a proper error screen.
 */
export function s2sTokenProvider(http: HttpClient, now: () => number = Date.now): S2sTokenProvider {
  let cached: { token: string; expiresAt: number } | undefined;

  return async function token(): Promise<string> {
    if (cached && cached.expiresAt > now()) {
      return cached.token;
    }

    const url = `${config.get<string>("s2s.url")}/lease`;
    const body = JSON.stringify({
      microservice: config.get<string>("s2s.microservice"),
      oneTimePassword: authenticator.generate(config.get<string>("s2s.secret"))
    });

    const reply = await http(url, { method: "POST", headers: { "content-type": "application/json" }, body });
    const text = await reply.text();
    if (!reply.ok) {
      throw new CcdError(`s2s lease failed with ${reply.status}`, reply.status);
    }

    // The lease endpoint answers with the bare JWT, not JSON.
    const jwt = text.trim();
    if (!jwt) {
      throw new CcdError("s2s lease returned an empty token", reply.status);
    }

    cached = { token: jwt, expiresAt: now() + LEASE_LIFETIME_MS };
    return jwt;
  };
}

export type S2sTokenProvider = () => Promise<string>;

/**
 * How long a minted token is reused for.
 *
 * S2S leases are valid for four hours, but the cache is deliberately far shorter:
 * a token that outlives its usefulness costs a failed submission, while re-minting
 * costs one cheap request an hour.
 */
const LEASE_LIFETIME_MS = 60 * 60 * 1000;
