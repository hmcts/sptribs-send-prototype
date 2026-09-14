import { z } from "zod";

// Parses a GOV.UK 3-part date input (`<prefix>-day`, `<prefix>-month`,
// `<prefix>-year`) into a UTC Date. On failure it returns a content key
// (required when all three fields are blank, invalid otherwise — including
// calendar overflow like 31 February) that translateErrors resolves against
// the page content at render time. Callers own any business rules
// (past-only, minimum age, ordering) on the returned Date.
export function parseDayMonthYear(body: Record<string, unknown>, prefix: string, keys: { required: string; invalid: string }): DayMonthYearResult {
  const day = String(body[`${prefix}-day`] ?? "").trim();
  const month = String(body[`${prefix}-month`] ?? "").trim();
  const year = String(body[`${prefix}-year`] ?? "").trim();
  if (!day && !month && !year) {
    return { error: keys.required };
  }

  const parsed = z
    .object({ day: z.coerce.number().int().min(1).max(31), month: z.coerce.number().int().min(1).max(12), year: z.coerce.number().int().min(1900).max(9999) })
    .safeParse({ day, month, year });
  if (!parsed.success) {
    return { error: keys.invalid };
  }

  const { day: d, month: m, year: y } = parsed.data;
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject overflow (e.g. 31 Feb rolls forward to March).
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return { error: keys.invalid };
  }

  return { date };
}

// Exactly one of date/error is set: a date on success, a content key on failure.
type DayMonthYearResult = { date?: Date; error?: string };
