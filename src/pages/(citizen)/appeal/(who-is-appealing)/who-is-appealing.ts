import type { Request, Response } from "express";
import { z } from "zod";
import { draftFrom, updateDraft } from "#appeal";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./who-is-appealing.i18n.js";

/**
 * Who is making the appeal — SEND35 question 2.1.
 *
 * First question in the journey, and deliberately not behind the task list. It decides
 * eligibility, and a young person appealing alone has an age condition to check before
 * they spend time answering anything else.
 */
const BACK = "/";
const NEXT = "/appeal/child-name";

const schema = z.object({
  whoIsAppealing: z.enum(["parentOrCarer", "youngPerson", "alternativePerson"], { message: "whoIsAppealingRequired" })
});

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).appellant;
  render(
    res,
    {
      whoIsAppealing: section.whoIsAppealing ?? ""
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
  res.redirect(302, parsed.data.whoIsAppealing === "youngPerson" ? "/appeal/young-person-age" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("who-is-appealing", { en, cy, values, errors, backHref: BACK });
}

export const GET = getHandler;
export const POST = postHandler;
