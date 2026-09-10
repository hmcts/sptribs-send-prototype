import type { Request, Response } from "express";
import { z } from "zod";
import { type AppealDraft, draftFrom, isoDate, replaceSection } from "#appeal";
import { requireRole } from "#oidc";
import { fieldErrors, parseDayMonthYear } from "#zod-validation";
import { cy, en } from "./supporting-evidence.i18n.js";

/**
 * The supporting-evidence table, as the Design System's "add another" pattern.
 *
 * One row at a time with the rows already added listed above the form, rather than a
 * grid of empty inputs. Most appeals have one or two pieces of evidence, and a table of
 * five blank rows both looks like a demand and is unusable on a phone.
 *
 * Deliberately no file upload. SEND35's table describes the evidence; the documents
 * themselves go to the tribunal separately, and uploading them means CDAM, virus
 * scanning and a retention policy — none of which a prototype should pretend to have.
 * That is recorded in docs/service-design.md.
 */
const BACK = "/appeal/documents-checklist";
const NEXT = "/appeal/task-list";

const schema = z.object({
  evidenceDescription: z.string().trim().min(1, "evidenceDescriptionRequired").max(500, "evidenceDescriptionTooLong"),
  signedBy: z.string().trim().max(255, "signedByTooLong").optional().default(""),
  pageCount: z.string().trim().max(10, "pageCountTooLong").optional().default("")
});

const getHandler = (req: Request, res: Response) => {
  render(req, res, {}, {});
};

const postHandler = async (req: Request, res: Response) => {
  if (typeof req.body.remove === "string") {
    return removeRow(req, res, Number(req.body.remove));
  }
  if (typeof req.body.continue === "string") {
    return res.redirect(302, NEXT);
  }

  const errors: Record<string, string> = {};
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    Object.assign(errors, fieldErrors(parsed.error));
  }

  // The date is optional here, so a blank one is not an error — only a nonsense one is.
  const documentDate = parseDayMonthYear(req.body, "documentDate", { required: "", invalid: "documentDateInvalid" });
  if (documentDate.error) {
    errors.documentDate = documentDate.error;
  }

  if (Object.keys(errors).length > 0) {
    return render(req, res, req.body, errors);
  }

  const rows = [...draftFrom(req).supportingEvidence, { ...parsed.data, documentDate: dateParts(req.body, "documentDate") }];
  await replaceSection(req, "supportingEvidence", rows);
  res.redirect(302, "/appeal/supporting-evidence");
};

async function removeRow(req: Request, res: Response, index: number): Promise<void> {
  const rows = draftFrom(req).supportingEvidence.filter((_, at) => at !== index);
  await replaceSection(req, "supportingEvidence", rows);
  res.redirect(302, "/appeal/supporting-evidence");
}

function dateParts(body: Record<string, unknown>, prefix: string) {
  return {
    day: String(body[`${prefix}-day`] ?? "").trim(),
    month: String(body[`${prefix}-month`] ?? "").trim(),
    year: String(body[`${prefix}-year`] ?? "").trim()
  };
}

function render(req: Request, res: Response, values: Record<string, unknown>, errors: Record<string, string>): void {
  res.render("supporting-evidence", {
    en,
    cy,
    values,
    errors,
    rows: summarise(draftFrom(req).supportingEvidence),
    backHref: BACK
  });
}

/** Each added row as the two lines the page shows, so the template has no logic in it. */
function summarise(rows: AppealDraft["supportingEvidence"]): { description: string; detail: string }[] {
  return rows.map((row) => ({
    description: row.evidenceDescription ?? "",
    detail: [row.signedBy, row.documentDate && isoDate(row.documentDate), row.pageCount && `${row.pageCount} pages`].filter(Boolean).join(", ")
  }));
}

export const GET = [requireRole("citizen"), getHandler];
export const POST = [requireRole("citizen"), postHandler];
