import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./recommendation-type.i18n.js";

/**
 * Which recommendations are wanted — SEND35 question 11.2.
 */
const BACK = "/appeal/health-social-care";
// No single NEXT: health and social care are separate pages and the answer decides which
// one comes first. Where both were chosen, the health page routes on to social care.

/** One ticked checkbox posts a string; several post an array. Normalise before validating. */
const toArray = (value: string | string[] | undefined): string[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

const schema = z.object({
  recommendationTypes: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray)
    .pipe(z.array(z.enum(["health", "socialCare"])).min(1, "recommendationTypesRequired"))
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).healthAndSocialCare;
  render(
    res,
    {
      recommendationTypes: section.recommendationTypes ?? []
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
  res.redirect(302, parsed.data.recommendationTypes.includes("health") ? "/appeal/health-issues" : "/appeal/social-care-issues");
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("recommendation-type", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
