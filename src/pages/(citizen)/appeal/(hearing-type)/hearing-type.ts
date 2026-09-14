import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./hearing-type.i18n.js";

/**
 * The preferred hearing format — SEND35 question 16.1.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/earlier-hearing";

const schema = z.object({
  preferredType: z.enum(["attended", "paper"], { message: "preferredTypeRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).hearingPreferences;
  render(
    res,
    {
      preferredType: section.preferredType ?? ""
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

  await updateDraft(req, "hearingPreferences", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("hearing-type", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
