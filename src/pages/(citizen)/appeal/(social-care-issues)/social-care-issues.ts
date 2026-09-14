import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./social-care-issues.i18n.js";

/**
 * Social care issues and recommendations — SEND35 questions 11.5 and 11.6.
 */
const BACK = "/appeal/recommendation-type";
const NEXT = "/appeal/task-list";

const schema = z.object({
  socialCareIssues: z.string().trim().min(1, "socialCareIssuesRequired").max(5000, "socialCareIssuesTooLong"),
  socialCareRecommendations: z.string().trim().min(1, "socialCareRecommendationsRequired").max(5000, "socialCareRecommendationsTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).healthAndSocialCare;
  render(
    res,
    {
      socialCareIssues: section.socialCareIssues ?? "",
      socialCareRecommendations: section.socialCareRecommendations ?? ""
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
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("social-care-issues", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
