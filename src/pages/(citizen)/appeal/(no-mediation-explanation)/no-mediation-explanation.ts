import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./no-mediation-explanation.i18n.js";

/**
 * The explanation for having no mediation certificate — SEND35 question 12.2.
 */
const BACK = "/appeal/no-mediation-reason";
const NEXT = "/appeal/task-list";

const schema = z.object({
  noCertificateExplanation: z.string().trim().min(1, "noCertificateExplanationRequired").max(5000, "noCertificateExplanationTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).mediation;
  render(
    res,
    {
      noCertificateExplanation: section.noCertificateExplanation ?? ""
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

  await updateDraft(req, "mediation", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("no-mediation-explanation", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
