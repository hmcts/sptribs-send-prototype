import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./health-issues.i18n.js";

/**
 * Health issues and recommendations — SEND35 questions 11.3 and 11.4.
 */
const BACK = "/appeal/recommendation-type";
const NEXT = "/appeal/task-list";

const schema = z.object({
  healthIssues: z.string().trim().min(1, "healthIssuesRequired").max(5000, "healthIssuesTooLong"),
  healthRecommendations: z.string().trim().min(1, "healthRecommendationsRequired").max(5000, "healthRecommendationsTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).healthAndSocialCare;
  render(
    res,
    {
      healthIssues: section.healthIssues ?? "",
      healthRecommendations: section.healthRecommendations ?? ""
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
  res.redirect(302, draftFrom(req).healthAndSocialCare.recommendationTypes?.includes("socialCare") ? "/appeal/social-care-issues" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("health-issues", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
