import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./reasons.i18n.js";

/**
 * The reasons for the appeal — SEND35 question 10.1.
 *
 * The one genuinely open question on the form, and the one the tribunal reads first.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

const schema = z.object({
  appealReasons: z.string().trim().min(1, "appealReasonsRequired").max(10000, "appealReasonsTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).reasons;
  render(
    res,
    {
      appealReasons: section.appealReasons ?? ""
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

  await updateDraft(req, "reasons", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("reasons", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
