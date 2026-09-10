import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./late-appeal-reason.i18n.js";

/**
 * The explanation for a late appeal — SEND35 question 13.3.
 *
 * Only reached when `timeLimit` says the appeal is out of time. This service does not
 * decide whether a late appeal proceeds; a tribunal judge reviews this answer.
 */
const BACK = "/appeal/mediation-certificate-date";
const NEXT = "/appeal/task-list";

const schema = z.object({
  lateAppealExplanation: z.string().trim().min(1, "lateAppealExplanationRequired").max(5000, "lateAppealExplanationTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).timeliness;
  render(
    res,
    {
      lateAppealExplanation: section.lateAppealExplanation ?? ""
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

  await updateDraft(req, "timeliness", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("late-appeal-reason", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
