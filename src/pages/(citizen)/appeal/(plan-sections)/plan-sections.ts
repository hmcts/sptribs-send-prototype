import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./plan-sections.i18n.js";

/**
 * Which parts of the plan are disputed — SEND35 question 8.3.
 */
const BACK = "/appeal/what-are-you-appealing";
const NEXT = "/appeal/annual-review";

/** One ticked checkbox posts a string; several post an array. Normalise before validating. */
const toArray = (value: string | string[] | undefined): string[] => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

const schema = z.object({
  planSections: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray)
    .pipe(z.array(z.enum(["sectionB", "sectionF", "sectionI"])).min(1, "planSectionsRequired"))
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).typeOfAppeal;
  render(
    res,
    {
      planSections: section.planSections ?? []
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
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("plan-sections", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
