import type { Request, Response } from "express";
import { cy, en } from "./logged-out.i18n.js";

export const GET = (_req: Request, res: Response) => {
  res.render("logged-out", { en, cy });
};
