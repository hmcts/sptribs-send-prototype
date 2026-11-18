import type { Request, Response } from "express";
import { requireRole } from "#oidc";
import { cy, en } from "./confirmation.i18n.js";

/**
 * The confirmation page.
 *
 * Reads the reference from the session rather than the URL. A case reference in a URL is
 * also in a browser history, a proxy log and anything the citizen pastes into a message
 * asking for help.
 *
 * Somebody arriving here without having submitted goes to the start page. Rendering a
 * confirmation panel with no reference on it would tell them their appeal had been sent
 * when it had not.
 */
const getHandler = (req: Request, res: Response) => {
  const submitted = req.session.submittedAppeal;
  if (!submitted) {
    return res.redirect(302, "/");
  }
  res.render("confirmation", { en, cy, reference: submitted.reference, childName: submitted.childName });
};

export const GET = [requireRole("citizen"), getHandler];
