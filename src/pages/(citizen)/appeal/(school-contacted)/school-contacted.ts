import type { Request, Response } from "express";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { parseDayMonthYear } from "#zod-validation";
import { cy, en } from "./school-contacted.i18n.js";

/**
 * When the provider was contacted — SEND35 question 9.5.
 */
const BACK = "/appeal/school-address";
const NEXT = "/appeal/school-response";

/** The three parts as typed, kept as strings so a half-finished date survives a save. */
function dateParts(body: Record<string, unknown>, prefix: string) {
  return {
    day: String(body[`${prefix}-day`] ?? "").trim(),
    month: String(body[`${prefix}-month`] ?? "").trim(),
    year: String(body[`${prefix}-year`] ?? "").trim()
  };
}

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).schoolOrProvider;
  render(
    res,
    {
      "dateContacted-day": section.dateContacted?.day ?? "",
      "dateContacted-month": section.dateContacted?.month ?? "",
      "dateContacted-year": section.dateContacted?.year ?? ""
    },
    {}
  );
};

const postHandler = async (req: Request, res: Response) => {
  const errors: Record<string, string> = {};
  const dateContacted = parseDayMonthYear(req.body, "dateContacted", { required: "dateContactedRequired", invalid: "dateContactedInvalid" });
  if (dateContacted.error) {
    errors.dateContacted = dateContacted.error;
  }

  if (Object.keys(errors).length > 0) {
    return render(res, req.body, errors);
  }

  await updateDraft(req, "schoolOrProvider", {
    dateContacted: dateParts(req.body, "dateContacted")
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("school-contacted", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
