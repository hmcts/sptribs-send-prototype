import type { Request, Response } from "express";
import { type CookieCategories, type CookiePreferences, readPreferences, savePreferences } from "../../../middleware/cookies.js";
import { cy, en } from "./cookies.i18n.js";

/**
 * Cookie preferences.
 *
 * Open to everyone — a cookie decision cannot be gated behind signing in.
 */
export const GET = async (req: Request, res: Response) => {
  render(req, res, req.query.saved === "true");
};

export const POST = async (req: Request, res: Response) => {
  const categories = res.locals.cookieCategories as CookieCategories;
  const body = req.body as Record<string, unknown>;

  const preferences: CookiePreferences = {};
  for (const category of Object.keys(categories)) {
    // Essential cookies are not a choice; recorded as true so the stored policy is complete.
    preferences[category] = category === "essential" ? true : body[category] === "on";
  }

  savePreferences(res, preferences);
  // Redirect rather than render, so a refresh does not re-submit and the success banner is
  // reachable by its own URL.
  res.redirect("/cookies?saved=true");
};

function render(req: Request, res: Response, saved: boolean): void {
  const categories = res.locals.cookieCategories as CookieCategories;
  res.render("cookies", {
    en,
    cy,
    saved,
    categories,
    preferences: readPreferences(req)
  });
}
