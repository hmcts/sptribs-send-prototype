import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./school-disagreement.i18n.js";

/**
 * The nature of the Section I disagreement — SEND35 question 9.1.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/school-requested";

const schema = z.object({
  sectionIDisagreement: z.enum(["disagreeWithNamed", "noneNamed"], { message: "sectionIDisagreementRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).schoolOrProvider;
  render(
    res,
    {
      sectionIDisagreement: section.sectionIDisagreement ?? ""
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

  await updateDraft(req, "schoolOrProvider", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("school-disagreement", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
