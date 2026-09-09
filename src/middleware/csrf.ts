import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const FIELD_NAME = "_csrf";
const HEADER_NAME = "x-csrf-token";
const SECRET_BYTES = 32;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const MULTIPART = "multipart/form-data";

/**
 * Session-backed synchroniser-token CSRF protection.
 *
 * A per-session secret is minted on first request and kept in the (Redis-backed,
 * signed-cookie-addressed) session. Every render gets a fresh token derived from
 * that secret plus a random salt, exposed as `res.locals.csrfToken`; templates
 * emit it with the `csrfInput()` nunjucks global or the `_csrf-input.njk`
 * partial. Unsafe requests must present a token whose HMAC matches the session
 * secret, or they are rejected with a GDS-styled 403.
 *
 * The token is not the secret, so it is safe to render into HTML; a per-render
 * salt means tokens differ between pages and cannot be replayed by a BREACH-style
 * compression oracle.
 *
 * ## Multipart posts
 *
 * This is mounted app-level, ahead of the router, where the body of a
 * `multipart/form-data` post has not been parsed yet — so a file upload's `_csrf`
 * field is invisible here and the request would be rejected. Multipart is therefore
 * skipped here and checked by `verifyCsrf()` instead, which the upload middleware
 * mounts itself so a page cannot forget it. See `upload.ts`.
 */
export function csrf(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session) {
      return next(new Error("csrf() must be mounted after the session middleware"));
    }

    const secret = ensureSecret(req);

    if (needsToken(req) && !isValidToken(readToken(req), secret)) {
      return rejectRequest(res);
    }

    res.locals.csrfToken = createToken(secret);
    next();
  };
}

/**
 * Re-check the token once the body has been parsed.
 *
 * The app-level `csrf()` cannot check a multipart post — the body is still an unparsed
 * stream when it runs — so it defers, and this makes good on that. It is mounted by
 * `uploadSingle`/`uploadMultiple` immediately after multer rather than being left to
 * each page, because a deferred check that a route forgets to complete is an
 * unprotected endpoint.
 *
 * A file has been written to disk by the time this runs. That is the cost of accepting
 * a multipart upload at all; the size and type limits are what bound it, and the
 * request still cannot start a job or change any state.
 *
 * Deliberately not multipart-only. It is the same check on any unsafe method, so a
 * caller cannot get it subtly wrong by applying it to a route that turns out not to be
 * multipart — and running it twice costs one HMAC. Safe methods pass straight through,
 * because they were never owed a token.
 */
export function verifyCsrf(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) {
      return next();
    }
    // No secret means `csrf()` never ran, so this would be checking a token against
    // nothing and would reject every request as a 403 — a broken endpoint that looks
    // like a security control working. Failing loudly names the wiring mistake instead.
    if (!req.session?.csrfSecret) {
      return next(new Error("verifyCsrf() must be mounted after csrf()"));
    }
    if (!isValidToken(readToken(req), req.session.csrfSecret)) {
      return rejectRequest(res);
    }
    next();
  };
}

/**
 * Whether `csrf()` itself should demand a token.
 *
 * Multipart is deferred to `verifyCsrf`, so a route that accepts an upload without
 * mounting it would be unprotected. The upload middleware bundles the verifier with
 * its handlers to stop that being possible to forget.
 */
function needsToken(req: Request): boolean {
  return !SAFE_METHODS.has(req.method) && !req.is(MULTIPART);
}

function createToken(secret: string): string {
  const salt = randomBytes(8).toString("hex");
  return `${salt}.${sign(salt, secret)}`;
}

function ensureSecret(req: Request): string {
  if (!req.session.csrfSecret) {
    req.session.csrfSecret = randomBytes(SECRET_BYTES).toString("hex");
  }
  return req.session.csrfSecret;
}

function readToken(req: Request): string | undefined {
  const fromBody = (req.body as Record<string, unknown> | undefined)?.[FIELD_NAME];
  if (typeof fromBody === "string") {
    return fromBody;
  }
  const fromHeader = req.get(HEADER_NAME);
  return typeof fromHeader === "string" ? fromHeader : undefined;
}

function isValidToken(token: string | undefined, secret: string): boolean {
  if (!token) {
    return false;
  }
  const [salt, digest] = token.split(".");
  if (!salt || !digest) {
    return false;
  }
  return equals(digest, sign(salt, secret));
}

function sign(salt: string, secret: string): string {
  return createHmac("sha256", secret).update(salt).digest("hex");
}

function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function rejectRequest(res: Response): void {
  res.status(403).render("_errors/csrf", {
    en: {
      title: "Sorry, there is a problem with the service",
      intro: "The page you were on has expired or was submitted twice. Start again from the beginning.",
      back: "Return to start"
    },
    cy: {
      title: "Mae'n ddrwg gennym, mae problem gyda'r gwasanaeth",
      intro: "Mae'r dudalen yr oeddech arni wedi dod i ben neu wedi'i chyflwyno ddwywaith. Dechreuwch eto o'r dechrau.",
      back: "Dychwelyd i'r dudalen ddechrau"
    }
  });
}
