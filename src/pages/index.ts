import type { Request, Response } from "express";
import { cy, en } from "./index.i18n.js";

/**
 * The GOV.UK start page.
 *
 * A real page rather than a redirect to /login, because the Service Manual's start
 * page is where somebody decides whether this service is for them at all: what can be
 * appealed, who may appeal, the two-month deadline, and what they need to hand. Making
 * people sign in before they can read any of that turns a decision into a dead end.
 */
export const GET = (_req: Request, res: Response) => {
  res.render("index", { en, cy });
};
