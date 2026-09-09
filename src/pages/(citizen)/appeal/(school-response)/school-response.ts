import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./school-response.i18n.js";

/**
 * The provider's response — SEND35 question 9.6, optional.
 */
const BACK = "/appeal/school-contacted";
const NEXT = "/appeal/task-list";

const schema = z.object({
  providerResponse: z.string().trim().max(2000, "providerResponseTooLong").optional().default("")
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).schoolOrProvider;
  render(
    res,
    {
      providerResponse: section.providerResponse ?? ""
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
  res.render("school-response", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
