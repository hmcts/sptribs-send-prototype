import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./parental-responsibility-details.i18n.js";

/**
 * Who else holds parental responsibility and whether they know — SEND35 questions 7.2 and 7.3.
 */
const BACK = "/appeal/parental-responsibility";
const NEXT = "/appeal/task-list";

const schema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(255, "nameTooLong"),
  told: z.enum(["Yes", "No"], { message: "toldRequired" }),
  reasonNotTold: z.string().trim().max(2000, "reasonNotToldTooLong").optional().default("")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).parentalResponsibility;
  render(
    res,
    {
      name: section.name ?? "",
      told: section.told ?? "",
      reasonNotTold: section.reasonNotTold ?? ""
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

  await updateDraft(req, "parentalResponsibility", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("parental-responsibility-details", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
