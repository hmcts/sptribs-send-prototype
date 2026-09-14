import { z } from "zod";

// Parses a GOV.UK month/year date input (`<prefix>-month`, `<prefix>-year`)
// into a UTC Date at the first of the month. On failure it returns a content
// key (required when both fields are blank, invalid otherwise) that
// translateErrors resolves against the page content at render time. Callers
// own any cross-field rules (ordering, future-date) on the returned Date.
export function parseMonthYear(body: Record<string, unknown>, prefix: string, keys: { required: string; invalid: string }): MonthYearResult {
  const month = String(body[`${prefix}-month`] ?? "").trim();
  const year = String(body[`${prefix}-year`] ?? "").trim();
  if (!month && !year) {
    return { error: keys.required };
  }

  const parsed = z.object({ month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(1900).max(9999) }).safeParse({ month, year });
  if (!parsed.success) {
    return { error: keys.invalid };
  }

  return { date: new Date(Date.UTC(parsed.data.year, parsed.data.month - 1, 1)) };
}

// Exactly one of date/error is set: a date on success, a content key on failure.
type MonthYearResult = { date?: Date; error?: string };
