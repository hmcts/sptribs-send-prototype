import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./additional-parent-details.i18n.js";

/**
 * The other parent or carer's details — SEND35 question 3.1.
 */
const BACK = "/appeal/additional-parent";
const NEXT = "/appeal/task-list";

/** Deliberately loose: GOV.UK guidance is to check for an @ and not to reject unusual but valid addresses. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const schema = z.object({
  firstName: z.string().trim().min(1, "firstNameRequired").max(100, "firstNameTooLong"),
  lastName: z.string().trim().min(1, "lastNameRequired").max(100, "lastNameTooLong"),
  relationship: z.string().trim().min(1, "relationshipRequired").max(100, "relationshipTooLong"),
  phoneNumber: z.string().trim().max(30, "phoneNumberTooLong").optional().default(""),
  emailAddress: z
    .string()
    .trim()
    .max(255, "emailAddressTooLong")
    .refine((value) => value === "" || EMAIL.test(value), { message: "emailAddressInvalid" })
    .optional()
    .default("")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).additionalParents;
  render(
    res,
    {
      firstName: section.firstName ?? "",
      lastName: section.lastName ?? "",
      relationship: section.relationship ?? "",
      phoneNumber: section.phoneNumber ?? "",
      emailAddress: section.emailAddress ?? ""
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
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("additional-parent-details", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
