import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./what-are-you-appealing.i18n.js";

/**
 * What the appeal is about — SEND35 question 8.1.
 *
 * Drives most of the rest of the journey: which sections of the plan can be disputed,
 * whether Section 9 applies, and whether a mediation certificate is needed.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

/** One ticked checkbox posts a string; several post an array. Normalise before validating. */
const toArray = (value: string | string[] | undefined): string[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

const schema = z.object({
  appealAbout: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray)
    .pipe(z.array(z.enum(["refusedToMakePlan", "refusedReassessment", "planContent", "planNoLongerNecessary"])).min(1, "appealAboutRequired"))
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).typeOfAppeal;
  render(
    res,
    {
      appealAbout: section.appealAbout ?? []
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

  await updateDraft(req, "typeOfAppeal", {
    ...parsed.data
  });
  res.redirect(
    302,
    parsed.data.appealAbout.includes("planContent")
      ? "/appeal/plan-sections"
      : parsed.data.appealAbout.includes("planNoLongerNecessary")
        ? "/appeal/annual-review"
        : NEXT
  );
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("what-are-you-appealing", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
