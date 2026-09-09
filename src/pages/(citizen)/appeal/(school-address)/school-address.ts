import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./school-address.i18n.js";

/**
 * The provider's address — SEND35 question 9.4.
 */
const BACK = "/appeal/school-details";
const NEXT = "/appeal/school-contacted";

const schema = z.object({
  providerAddress: z.object({
    addressLine1: z.string().trim().min(1, "providerAddressAddressLine1Required").max(100, "providerAddressAddressLine1TooLong"),
    addressLine2: z.string().trim().max(100, "providerAddressAddressLine2TooLong").optional().default(""),
    townOrCity: z.string().trim().min(1, "providerAddressTownOrCityRequired").max(100, "providerAddressTownOrCityTooLong"),
    county: z.string().trim().max(100, "providerAddressCountyTooLong").optional().default(""),
    postcode: z.string().trim().min(1, "providerAddressPostcodeRequired").max(10, "providerAddressPostcodeTooLong")
  })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).schoolOrProvider;
  render(
    res,
    {
      providerAddress: section.providerAddress ?? {}
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

  await updateDraft(req, "schoolOrProvider", {
    ...parsed.data
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("school-address", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
