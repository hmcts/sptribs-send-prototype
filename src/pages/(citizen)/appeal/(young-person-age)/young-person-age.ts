import type { Request, Response } from "express";
import { z } from "zod";
import { fieldErrors } from "#zod-validation";
import { cy, en } from "./young-person-age.i18n.js";

/**
 * The age condition on a young person appealing alone.
 *
 * Asked immediately after "who is making the appeal", and only on that route. SEND35
 * puts the condition in a note; asking it turns a note into a check, so somebody who
 * cannot use this service is told before they answer 40 more questions.
 *
 * The answer is not stored: it is an eligibility gate, not a fact about the appeal, and
 * the tribunal derives age from the child or young person's date of birth anyway.
 */
const BACK = "/appeal/who-is-appealing";
const NEXT = "/appeal/child-name";
const INELIGIBLE = "/appeal/cannot-use-this-service?reason=age";

const schema = z.object({
  overSchoolAge: z.enum(["Yes", "No"], { message: "overSchoolAgeRequired" })
});

export const GET = (_req: Request, res: Response) => {
  render(res, {}, {});
};

export const POST = (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return render(res, req.body, fieldErrors(parsed.error));
  }
  res.redirect(302, parsed.data.overSchoolAge === "Yes" ? NEXT : INELIGIBLE);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("young-person-age", { en, cy, values, errors, backHref: BACK });
}
