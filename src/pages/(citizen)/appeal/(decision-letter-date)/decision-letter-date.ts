import type { Request, Response } from "express";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { parseDayMonthYear } from "#zod-validation";
import { cy, en } from "./decision-letter-date.i18n.js";

/**
 * The decision letter date — SEND35 question 13.1.
 *
 * The two-month time limit runs from here, so `#appeal`'s `timeLimit` needs it before it
 * can say anything about whether the appeal is late.
 */
const BACK = "/appeal/task-list";
const NEXT = "/appeal/mediation-certificate-date";

/** The three parts as typed, kept as strings so a half-finished date survives a save. */
function dateParts(body: Record<string, unknown>, prefix: string) {
  return {
    day: String(body[`${prefix}-day`] ?? "").trim(),
    month: String(body[`${prefix}-month`] ?? "").trim(),
    year: String(body[`${prefix}-year`] ?? "").trim()
  };
}

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).timeliness;
  render(
    res,
    {
      "decisionLetterDate-day": section.decisionLetterDate?.day ?? "",
      "decisionLetterDate-month": section.decisionLetterDate?.month ?? "",
      "decisionLetterDate-year": section.decisionLetterDate?.year ?? ""
    },
    {}
  );
};

const postHandler = async (req: Request, res: Response) => {
  const errors: Record<string, string> = {};
  const decisionLetterDate = parseDayMonthYear(req.body, "decisionLetterDate", {
    required: "decisionLetterDateRequired",
    invalid: "decisionLetterDateInvalid"
  });
  if (decisionLetterDate.error) {
    errors.decisionLetterDate = decisionLetterDate.error;
  }

  if (Object.keys(errors).length > 0) {
    return render(res, req.body, errors);
  }

  await updateDraft(req, "timeliness", {
    decisionLetterDate: dateParts(req.body, "decisionLetterDate")
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("decision-letter-date", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
