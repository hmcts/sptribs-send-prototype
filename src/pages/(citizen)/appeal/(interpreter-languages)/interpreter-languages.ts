import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./interpreter-languages.i18n.js";

/**
 * The languages needed — SEND35 question 17.1.
 */
const BACK = "/appeal/interpreter";
const NEXT = "/appeal/task-list";

const schema = z.object({
  languages: z.string().trim().min(1, "languagesRequired").max(500, "languagesTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).support;
  render(
    res,
    {
      languages: section.languages ?? ""
    },
    {}
  );
};

const postHandler = async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);

  // The || is what narrows parsed for the store below; the length check is what lets a
  // date error and a field error be shown together rather than one page apart.
  if (!parsed.success || Object.keys(errors).length > 0) {
    return render(res, req.body, errors);
  }

  await updateDraft(req, "support", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("interpreter-languages", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
