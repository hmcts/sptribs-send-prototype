import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./who-receives-information.i18n.js";

/**
 * The single point of contact for the appeal — SEND35 question 6.1.
 *
 * SEND35 restricts the choice to people named elsewhere on the form. The options are
 * listed in full here rather than filtered, so a citizen can see what the choice would
 * be; filtering to the people actually named is the obvious next iteration.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/contact-details-for-updates";

const schema = z.object({
  recipient: z.enum(["parentOrCarer", "youngPerson", "representative", "advocate", "alternativePerson"], { message: "recipientRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).communication;
  render(
    res,
    {
      recipient: section.recipient ?? ""
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
  res.render("who-receives-information", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
