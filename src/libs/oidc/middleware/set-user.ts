import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { SendUser } from "../session-user.js";

declare module "express-serve-static-core" {
  interface Request {
    user?: SendUser;
  }
}

/**
 * Copy the persisted session user onto `req.user` so handlers and guards
 * have a single typed read site for identity. No DB call, no I/O — runs on
 * every request after the session middleware. Also exposes `isSignedIn` to
 * templates (via `res.locals`) so the header can show a Sign out link only
 * when there's a session to end.
 */
export function setUser(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.session.user) {
      req.user = req.session.user;
    }
    res.locals.isSignedIn = !!req.session.user;
    next();
  };
}
