import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./health-social-care.i18n.js";

/**
 * Whether health or social care recommendations are wanted — SEND35 question 11.1.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

const schema = z.object({
  wantRecommendation: z.enum(["Yes", "No"], { message: "wantRecommendationRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).healthAndSocialCare;
  render(
    res,
    {
      wantRecommendation: section.wantRecommendation ?? ""
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

  await updateDraft(req, "healthAndSocialCare", {
    ...parsed.data
  });
  res.redirect(302, parsed.data.wantRecommendation === "Yes" ? "/appeal/recommendation-type" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("health-social-care", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
