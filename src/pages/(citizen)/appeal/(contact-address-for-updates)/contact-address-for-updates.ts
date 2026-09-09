import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./contact-address-for-updates.i18n.js";

/**
 * The postal address for tribunal correspondence — SEND35 question 6.4.
 */
const BACK = "/appeal/contact-details-for-updates";
const NEXT = "/appeal/task-list";

const schema = z.object({
  address: z.object({
    addressLine1: z.string().trim().min(1, "addressAddressLine1Required").max(100, "addressAddressLine1TooLong"),
    addressLine2: z.string().trim().max(100, "addressAddressLine2TooLong").optional().default(""),
    townOrCity: z.string().trim().min(1, "addressTownOrCityRequired").max(100, "addressTownOrCityTooLong"),
    county: z.string().trim().max(100, "addressCountyTooLong").optional().default(""),
    postcode: z.string().trim().min(1, "addressPostcodeRequired").max(10, "addressPostcodeTooLong")
  })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).communication;
  render(
    res,
    {
      address: section.address ?? {}
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

  await updateDraft(req, "communication", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("contact-address-for-updates", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
