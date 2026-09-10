import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./reasonable-adjustments.i18n.js";

/**
 * Whether reasonable adjustments are needed — SEND35 question 17.2.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

const schema = z.object({
  needsAdjustments: z.enum(["Yes", "No"], { message: "needsAdjustmentsRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).support;
  render(
    res,
    {
      needsAdjustments: section.needsAdjustments ?? ""
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

  await updateDraft(req, "support", {
    ...parsed.data
  });
  res.redirect(302, parsed.data.needsAdjustments === "Yes" ? "/appeal/reasonable-adjustments-detail" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("reasonable-adjustments", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
