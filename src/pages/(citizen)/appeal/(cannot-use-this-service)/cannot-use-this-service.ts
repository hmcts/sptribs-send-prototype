import type { Request, Response } from "express";
import { cy, en } from "./cannot-use-this-service.i18n.js";

/**
 * The dead end.
 *
 * One page rather than one per reason, because the shape is identical and the only thing
 * that differs is which paragraph applies. `?reason=` selects it; an unrecognised reason
 * falls back to the age case rather than rendering a page with no explanation on it.
 */
const REASONS = en.reasons;

export const GET = (req: Request, res: Response) => {
  const requested = String(req.query.reason ?? "");
  const reason = requested in REASONS ? (requested as keyof typeof REASONS) : "age";
  res.render("cannot-use-this-service", { en, cy, reason: REASONS[reason], backHref: "/appeal/who-is-appealing" });
};
