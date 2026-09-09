import type { Request, Response } from "express";
import { cy, en } from "./accessibility-statement.i18n.js";

export const GET = async (_req: Request, res: Response) => {
  res.render("accessibility-statement", { en, cy });
};
