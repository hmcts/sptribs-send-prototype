import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./additional-parent.i18n.js";

/**
 * Whether to name another parent or carer — SEND35 question 3.1.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

const schema = z.object({
  addParentOrCarer: z.enum(["Yes", "No"], { message: "addParentOrCarerRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).additionalParents;
  render(
    res,
    {
      addParentOrCarer: section.addParentOrCarer ?? ""
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

  await updateDraft(req, "additionalParents", {
    ...parsed.data
  });
  res.redirect(302, parsed.data.addParentOrCarer === "Yes" ? "/appeal/additional-parent-details" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("additional-parent", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
