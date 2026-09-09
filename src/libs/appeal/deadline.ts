import { isoDate } from "./case-data.js";
import type { AppealDraft, DateAnswer } from "./types.js";

/**
 * Whether the appeal is in time.
 *
 * SEND35: two months from the date on the local authority's decision letter, or one
 * month from the date on the mediation certificate if there is one. Where both apply
 * the appellant gets whichever is later — the one-month mediation window is there to
 * give time after mediation, not to shorten the two months.
 *
 * The tribunal, not this service, decides whether a late appeal proceeds. So being out
 * of time is never a dead end: it only makes the "explain why your appeal is late"
 * question apply, which a judge then reviews.
 */

export interface TimeLimit {
  /** The last day an appeal may be submitted, ISO. Undefined until a date is given. */
  deadline?: string;
  outOfTime: boolean;
}

export function timeLimit(draft: AppealDraft, today: Date = new Date()): TimeLimit {
  const decisionLetter = parse(draft.timeliness.decisionLetterDate);
  const certificate = parse(draft.timeliness.mediationCertificateDate);

  if (!decisionLetter && !certificate) {
    return { outOfTime: false };
  }

  const candidates = [decisionLetter && addMonths(decisionLetter, 2), certificate && addMonths(certificate, 1)].filter(
    (date): date is Date => date instanceof Date
  );

  const deadline = new Date(Math.max(...candidates.map((date) => date.getTime())));

  return {
    deadline: toIso(deadline),
    outOfTime: startOfDay(today).getTime() > deadline.getTime()
  };
}

/** True when the citizen has to explain a late appeal. */
export function needsLateExplanation(draft: AppealDraft, today: Date = new Date()): boolean {
  return timeLimit(draft, today).outOfTime;
}

function parse(date: DateAnswer | undefined): Date | undefined {
  const iso = date && isoDate(date);
  if (!iso) {
    return undefined;
  }
  // Parsed from the parts rather than from the string, because `new Date("…")` on a
  // date-only string is UTC midnight while `today` is local — a comparison that is
  // wrong by a day for anyone west of Greenwich.
  const [year, month, day] = iso.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Add whole months, clamping to the end of the target month.
 *
 * 31 December plus two months is 28 (or 29) February, not 3 March: the deadline must
 * never fall outside the month a person would count to.
 */
function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
