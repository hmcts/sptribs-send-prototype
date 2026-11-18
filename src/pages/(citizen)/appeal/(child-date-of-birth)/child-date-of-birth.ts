import type { Request, Response } from "express";
import { draftFrom, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { parseDayMonthYear } from "#zod-validation";
import { cy, en } from "./child-date-of-birth.i18n.js";

/**
 * The child or young person's date of birth — SEND35 question 1.1.
 */
const BACK = "/appeal/child-name";
const NEXT = "/appeal/child-gender";

/** The three parts as typed, kept as strings so a half-finished date survives a save. */
function dateParts(body: Record<string, unknown>, prefix: string) {
  return {
    day: String(body[`${prefix}-day`] ?? "").trim(),
    month: String(body[`${prefix}-month`] ?? "").trim(),
    year: String(body[`${prefix}-year`] ?? "").trim()
  };
}

const getHandler = (req: Request, res: Response) => {
  const section = draftFrom(req).childOrYoungPerson;
  render(
    res,
    {
      "dateOfBirth-day": section.dateOfBirth?.day ?? "",
      "dateOfBirth-month": section.dateOfBirth?.month ?? "",
      "dateOfBirth-year": section.dateOfBirth?.year ?? ""
    },
    {}
  );
};

const postHandler = async (req: Request, res: Response) => {
  const errors: Record<string, string> = {};
  const dateOfBirth = parseDayMonthYear(req.body, "dateOfBirth", { required: "dateOfBirthRequired", invalid: "dateOfBirthInvalid" });
  if (dateOfBirth.error) {
    errors.dateOfBirth = dateOfBirth.error;
  }

  if (Object.keys(errors).length > 0) {
    return render(res, req.body, errors);
  }

  await updateDraft(req, "childOrYoungPerson", {
    dateOfBirth: dateParts(req.body, "dateOfBirth")
  });
  res.redirect(302, NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("child-date-of-birth", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
