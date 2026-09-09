import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./your-relationship.i18n.js";

/**
 * The appellant's relationship to the child or young person — SEND35 question 2.2.
 *
 * Does not apply to a young person appealing alone; `sections.ts` hides the task and
 * the route from `your-name` skips it.
 */
const BACK = "/appeal/your-name";
const NEXT = "/appeal/your-contact-details";

const schema = z.object({
  relationship: z.string().trim().min(1, "relationshipRequired").max(100, "relationshipTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).appellant;
  render(
    res,
    {
      relationship: section.relationship ?? ""
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

  await updateDraft(req, "appellant", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("your-relationship", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
