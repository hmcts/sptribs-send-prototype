import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./other-court-case-details.i18n.js";

/**
 * The other court or tribunal case — SEND35 question 15.1.
 */
const BACK = "/appeal/other-court-cases";
const NEXT = "/appeal/task-list";

const schema = z.object({
  courtCaseDetails: z.string().trim().min(1, "courtCaseDetailsRequired").max(5000, "courtCaseDetailsTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).otherCases;
  render(
    res,
    {
      courtCaseDetails: section.courtCaseDetails ?? ""
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
  res.render("other-court-case-details", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
