import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { csrf } from "./csrf.js";

/**
 * The one security control this service implements itself, so it is tested for the
 * properties that make it one: an unsafe request without a valid token is refused, a token
 * from a different session is refused, and the value rendered into the page is not the
 * secret it is derived from.
 */

interface FakeSession {
  csrfSecret?: string;
}

/** `session: null` means no session at all — `undefined` would be indistinguishable from "not passed". */
function call(options: { method?: string; body?: Record<string, unknown>; header?: string; session?: FakeSession | null }) {
  const session = options.session === null ? undefined : (options.session ?? ({} as FakeSession));
  const req = {
    method: options.method ?? "GET",
    body: options.body,
    session,
    get: (name: string) => (name.toLowerCase() === "x-csrf-token" ? options.header : undefined)
  } as unknown as Request;

  const res = {
    locals: {} as Record<string, unknown>,
    statusCode: 200,
    rendered: undefined as string | undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    render(view: string) {
      this.rendered = view;
    }
  };

  const next = vi.fn();
  csrf()(req, res as unknown as Response, next);
  return { req, res, next, session };
}

/** A token this session would accept, obtained the way a page gets one: from a GET. */
function tokenFor(session: FakeSession): string {
  const { res } = call({ method: "GET", session });
  return res.locals.csrfToken as string;
}

describe("csrf", () => {
  it("should fail loudly if it is mounted before the session middleware", () => {
    const { next } = call({ session: null });

    // Silently doing nothing would look exactly like protection that works.
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("after the session middleware") }));
  });

  it("should mint a secret on the first request and keep it for the session", () => {
    const session: FakeSession = {};

    call({ session });
    const first = session.csrfSecret;
    call({ session });

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(session.csrfSecret).toBe(first);
  });

  it("should let a GET through and give the page a token", () => {
    const { res, next } = call({ method: "GET" });

    expect(next).toHaveBeenCalled();
    expect(res.locals.csrfToken).toMatch(/^[0-9a-f]{16}\.[0-9a-f]{64}$/);
  });

  it("should never render the secret into the page", () => {
    const session: FakeSession = {};
    const { res } = call({ method: "GET", session });

    expect(res.locals.csrfToken).not.toContain(session.csrfSecret);
  });

  it("should give a different token on every render", () => {
    // A per-render salt is what stops a token being replayed by a compression oracle.
    const session: FakeSession = {};

    expect(tokenFor(session)).not.toBe(tokenFor(session));
  });

  it("should accept a POST carrying a token from the same session", () => {
    const session: FakeSession = {};
    const token = tokenFor(session);

    const { next, res } = call({ method: "POST", body: { _csrf: token }, session });

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("should accept the token in a header, for anything posting without a form", () => {
    const session: FakeSession = {};
    const token = tokenFor(session);

    const { next } = call({ method: "POST", header: token, session });

    expect(next).toHaveBeenCalled();
  });

  it("should refuse a POST with no token", () => {
    const { next, res } = call({ method: "POST", body: {} });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    // A page rather than a bare 403: the usual cause is a form left open, not an attack.
    expect(res.rendered).toBe("_errors/csrf");
  });

  it("should refuse a token minted for a different session", () => {
    const attacker = tokenFor({});

    const { next, res } = call({ method: "POST", body: { _csrf: attacker }, session: {} });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("should refuse a token whose signature has been tampered with", () => {
    const session: FakeSession = {};
    const [salt] = tokenFor(session).split(".");

    const { next, res } = call({ method: "POST", body: { _csrf: `${salt}.${"0".repeat(64)}` }, session });

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("should refuse a malformed token rather than throw", () => {
    // timingSafeEqual throws on a length mismatch, so this is the case that would 500.
    for (const token of ["", ".", "nosalt", "salt.", ".digest", "salt.short"]) {
      const { next, res } = call({ method: "POST", body: { _csrf: token } });

      expect(next, `"${token}" was accepted`).not.toHaveBeenCalled();
      expect(res.statusCode, `"${token}" did not give a 403`).toBe(403);
    }
  });

  it("should refuse an unsafe method other than POST", () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const { res } = call({ method, body: {} });

      expect(res.statusCode, `${method} was allowed through`).toBe(403);
    }
  });

  it("should let the safe methods through untouched", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      const { next } = call({ method });

      expect(next, `${method} was blocked`).toHaveBeenCalled();
    }
  });
});
