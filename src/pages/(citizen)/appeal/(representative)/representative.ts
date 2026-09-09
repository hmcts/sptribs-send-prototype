import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./representative.i18n.js";

/**
 * Whether the appellant has a representative — SEND35 question 4.1.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/task-list";

const schema = z.object({
  hasRepresentative: z.enum(["Yes", "No"], { message: "hasRepresentativeRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).representative;
  render(
    res,
    {
      hasRepresentative: section.hasRepresentative ?? ""
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

  await updateDraft(req, "representative", {
    ...parsed.data
  });
  res.redirect(302, parsed.data.hasRepresentative === "Yes" ? "/appeal/representative-details" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("representative", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
