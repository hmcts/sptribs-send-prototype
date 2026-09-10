import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./representative-details.i18n.js";

/**
 * The representative's details — SEND35 questions 4.2 and 4.3.
 */
const BACK = "/appeal/representative";
const NEXT = "/appeal/task-list";

/** Deliberately loose: GOV.UK guidance is to check for an @ and not to reject unusual but valid addresses. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const schema = z.object({
  firstName: z.string().trim().min(1, "firstNameRequired").max(100, "firstNameTooLong"),
  lastName: z.string().trim().min(1, "lastNameRequired").max(100, "lastNameTooLong"),
  companyName: z.string().trim().max(100, "companyNameTooLong").optional().default(""),
  phoneNumber: z.string().trim().min(1, "phoneNumberRequired").max(30, "phoneNumberTooLong"),
  emailAddress: z
    .string()
    .trim()
    .min(1, "emailAddressRequired")
    .max(255, "emailAddressTooLong")
    .refine((value) => value === "" || EMAIL.test(value), { message: "emailAddressInvalid" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).representative;
  render(
    res,
    {
      firstName: section.firstName ?? "",
      lastName: section.lastName ?? "",
      companyName: section.companyName ?? "",
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

  await updateDraft(req, "representative", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("representative-details", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
