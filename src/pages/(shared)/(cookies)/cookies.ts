import type { Request, Response } from "express";
import { cy, en } from "./cookies.i18n.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("cookies", { en, cy });
};
