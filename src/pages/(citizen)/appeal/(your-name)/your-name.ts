import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./your-name.i18n.js";

/**
 * The appellant's name — SEND35 question 2.2.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/your-relationship";

const schema = z.object({
  firstName: z.string().trim().min(1, "firstNameRequired").max(100, "firstNameTooLong"),
  lastName: z.string().trim().min(1, "lastNameRequired").max(100, "lastNameTooLong")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).appellant;
  render(
    res,
    {
      firstName: section.firstName ?? "",
      lastName: section.lastName ?? ""
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
  res.render("your-name", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
