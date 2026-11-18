import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./mediation-certificate.i18n.js";

/**
 * Whether there is a mediation certificate — SEND35 question 12.1.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

const schema = z.object({
  hasCertificate: z.enum(["Yes", "No"], { message: "hasCertificateRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).mediation;
  render(
    res,
    {
      hasCertificate: section.hasCertificate ?? ""
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
  res.redirect(302, parsed.data.hasCertificate === "No" ? "/appeal/no-mediation-reason" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("mediation-certificate", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
