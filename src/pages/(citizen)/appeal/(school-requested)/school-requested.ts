import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./school-requested.i18n.js";

/**
 * Whether a specific provider has been asked for — SEND35 question 9.2.
 */
const BACK = "/appeal/school-disagreement";
const NEXT = "/appeal/school-type";

const schema = z.object({
  askedForProvider: z.enum(["Yes", "No"], { message: "askedForProviderRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).schoolOrProvider;
  render(
    res,
    {
      askedForProvider: section.askedForProvider ?? ""
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
  res.redirect(302, parsed.data.askedForProvider === "Yes" ? "/appeal/school-details" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("school-requested", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
