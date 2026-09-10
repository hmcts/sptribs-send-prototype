import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./other-send-appeal-references.i18n.js";

/**
 * The other SEND appeal references — SEND35 question 14.1.
 */
const BACK = "/appeal/other-send-appeals";
const NEXT = "/appeal/task-list";

const schema = z.object({
  appealReferenceNumbers: z.string().trim().min(1, "appealReferenceNumbersRequired").max(500, "appealReferenceNumbersTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).otherCases;
  render(
    res,
    {
      appealReferenceNumbers: section.appealReferenceNumbers ?? ""
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

  await updateDraft(req, "otherCases", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("other-send-appeal-references", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
