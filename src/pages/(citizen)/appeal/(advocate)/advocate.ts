import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./advocate.i18n.js";

/**
 * Whether the appellant has an advocate — SEND35 question 5.1.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

const schema = z.object({
  hasAdvocate: z.enum(["Yes", "No"], { message: "hasAdvocateRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).advocate;
  render(
    res,
    {
      hasAdvocate: section.hasAdvocate ?? ""
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

  await updateDraft(req, "advocate", {
    ...parsed.data
  });
  res.redirect(302, parsed.data.hasAdvocate === "Yes" ? "/appeal/advocate-details" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("advocate", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
