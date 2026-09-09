import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const FIELD_NAME = "_csrf";
const HEADER_NAME = "x-csrf-token";
const SECRET_BYTES = 32;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Session-backed synchroniser-token CSRF protection.
 *
 * A per-session secret is minted on first request and kept in the (Redis-backed,
 * signed-cookie-addressed) session. Every render gets a fresh token derived from that
 * secret plus a random salt, exposed as `res.locals.csrfToken`; templates emit it by
 * including `_partials/csrf-input.njk`. Unsafe requests must present a token whose HMAC
 * matches the session secret, or they are rejected with a GDS-styled 403.
 *
 * The token is not the secret, so it is safe to render into HTML; a per-render salt means
 * tokens differ between pages and cannot be replayed by a BREACH-style compression oracle.
 *
 * Every unsafe request is checked here, at app level, ahead of the router. That is only
 * possible because this service accepts no `multipart/form-data`: a multipart body is still
 * an unparsed stream at this point, so its `_csrf` field would be invisible and the check
 * would have to be deferred until after the body was parsed. If document upload is ever
 * added, that deferral comes back with it — and it has to be bundled with the upload
 * middleware rather than left to each page, because a deferred check a route forgets to
 * complete is an unprotected endpoint.
 */
export function csrf(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session) {
      return next(new Error("csrf() must be mounted after the session middleware"));
    }

    const secret = ensureSecret(req);

    if (!SAFE_METHODS.has(req.method) && !isValidToken(readToken(req), secret)) {
      return rejectRequest(res);
    }

    res.locals.csrfToken = createToken(secret);
    next();
  };
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

/** The hidden form field, or the header for anything posting without a form. */
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

/**
 * Constant-time comparison.
 *
 * `timingSafeEqual` throws on a length mismatch, so the lengths are compared first — that
 * comparison leaks only the length of a hex digest, which is fixed anyway.
 */
function equals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * A page, not a bare 403.
 *
 * The overwhelmingly common cause is not an attack: it is somebody coming back to a form
 * they left open, or submitting twice. They need to know what to do next, which is why this
 * renders and says it.
 */
function rejectRequest(res: Response): void {
  res.status(403).render("_errors/csrf", {
    en: {
      title: "Sorry, there is a problem with the service",
      intro: "The page you were on has expired or was submitted twice. Start again from the beginning.",
      back: "Return to start"
    },
    // SEND is an England-only jurisdiction, so there is no Welsh content to write.
    cy: {
      title: "Sorry, there is a problem with the service",
      intro: "The page you were on has expired or was submitted twice. Start again from the beginning.",
      back: "Return to start"
    }
  });
}
