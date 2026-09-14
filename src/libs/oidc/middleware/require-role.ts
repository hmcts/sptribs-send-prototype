import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { UserType } from "../session-user.js";

/**
 * Page-level guard on user type.
 *
 * - Anonymous → redirect to /login with the original URL as returnTo. This is
 *   what sends a first-time visitor out to IDAM.
 * - Authenticated but wrong user type → 403 `_errors/forbidden`.
 */
export function requireRole(userTypes: UserType | UserType[]): RequestHandler {
  const allowedTypes = Array.isArray(userTypes) ? userTypes : [userTypes];

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      const params = new URLSearchParams({ returnTo: req.originalUrl });
      return res.redirect(302, `/login?${params.toString()}`);
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).render("_errors/forbidden", forbiddenLocals);
    }

    next();
  };
}

const forbiddenLocals = {
  en: {
    title: "You do not have permission to view this page",
    back: "Return to start",
    signOut: "Sign out"
  },
  cy: {
    title: "Nid oes gennych ganiatâd i weld y dudalen hon",
    back: "Dychwelyd i'r dudalen ddechrau",
    signOut: "Allgofnodi"
  }
};
