import type { Request, Response } from "express";
import { draftFrom, needsLateExplanation, updateDraft } from "#appeal";
import { requireRole } from "#oidc";
import { parseDayMonthYear } from "#zod-validation";
import { cy, en } from "./mediation-certificate-date.i18n.js";

/**
 * The mediation certificate date — SEND35 question 13.2, optional.
 *
 * Routes on to the late-appeal explanation only when the appeal is actually out of time,
 * which `#appeal`'s `needsLateExplanation` works out from both dates.
 */
const BACK = "/appeal/decision-letter-date";
const NEXT = "/appeal/task-list";

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
      "mediationCertificateDate-day": section.mediationCertificateDate?.day ?? "",
      "mediationCertificateDate-month": section.mediationCertificateDate?.month ?? "",
      "mediationCertificateDate-year": section.mediationCertificateDate?.year ?? ""
    },
    {}
  );
};

const postHandler = async (req: Request, res: Response) => {
  const errors: Record<string, string> = {};
  // Optional: "" is empty, so all three parts blank is not an error.
  const mediationCertificateDate = parseDayMonthYear(req.body, "mediationCertificateDate", { required: "", invalid: "mediationCertificateDateInvalid" });
  if (mediationCertificateDate.error) {
    errors.mediationCertificateDate = mediationCertificateDate.error;
  }

  if (Object.keys(errors).length > 0) {
    return render(res, req.body, errors);
  }

  await updateDraft(req, "timeliness", {
    mediationCertificateDate: dateParts(req.body, "mediationCertificateDate")
  });
  res.redirect(302, needsLateExplanation(draftFrom(req)) ? "/appeal/late-appeal-reason" : NEXT);
};

function render(res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("mediation-certificate-date", { en, cy, values, errors, backHref: BACK });
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
