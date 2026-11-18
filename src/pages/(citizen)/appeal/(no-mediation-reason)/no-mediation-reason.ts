import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./no-mediation-reason.i18n.js";

/**
 * Why there is no mediation certificate — SEND35 question 12.2.
 */
const BACK = "/appeal/mediation-certificate";
const NEXT = "/appeal/task-list";

const schema = z.object({
  noCertificateReason: z.enum(["sectionIOnly", "otherReason"], { message: "noCertificateReasonRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).mediation;
  render(
    res,
    {
      noCertificateReason: section.noCertificateReason ?? ""
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
  res.redirect(302, parsed.data.noCertificateReason === "otherReason" ? "/appeal/no-mediation-explanation" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("no-mediation-reason", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
