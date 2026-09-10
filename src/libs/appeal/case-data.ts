import type { Address, AppealDraft, DateAnswer, EvidenceRow } from "./types.js";

/**
 * Turn the draft into the `data` map CCD stores for a `StSend35` case.
 *
 * The CCD field id is not the draft property name. Each SEND35 section lives on its
 * own `@JsonUnwrapped(prefix = "…")` complex in the case type, and the SDK derives a
 * field id by concatenating that prefix with the nested `@JsonProperty` — so
 * `childOrYoungPerson.firstName` is the CCD field `cypFirstName`.
 *
 * Sending the wrong key does not fail quietly: CCD validates every key against the
 * case type and rejects the whole submission on the first one it does not recognise.
 * `SECTION_PREFIX` is therefore the single place the two repos have to agree, and
 * `case-data.test.ts` pins every id it produces.
 *
 * Unanswered questions are omitted rather than sent as null — an optional question
 * the citizen skipped has no value, and an explicit null on a non-nullable CCD field
 * is a validation error.
 */

/** Section key to `@JsonUnwrapped(prefix)` in `StSend35CaseData`. */
const SECTION_PREFIX = {
  childOrYoungPerson: "cyp",
  appellant: "appellant",
  additionalParents: "parents",
  representative: "rep",
  advocate: "adv",
  communication: "comms",
  parentalResponsibility: "pr",
  typeOfAppeal: "appeal",
  schoolOrProvider: "school",
  reasons: "reasons",
  healthAndSocialCare: "hsc",
  mediation: "med",
  timeliness: "time",
  otherCases: "other",
  hearingPreferences: "hearing",
  support: "support",
  declaration: "decl"
} as const;

/**
 * The prefix plus the capitalised property name — and nothing else.
 *
 * There is deliberately no lookup table. Every draft property is named for its Java
 * counterpart, so the id falls out of the name; a table of exceptions is a table
 * nobody can check against the other repo by eye. `case-data.test.ts` pins the full
 * set of ids against the case type instead.
 */
export function ccdFieldId(section: keyof typeof SECTION_PREFIX, property: string): string {
  return SECTION_PREFIX[section] + property.charAt(0).toUpperCase() + property.slice(1);
}

export function caseDataFrom(draft: AppealDraft): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const section of Object.keys(SECTION_PREFIX) as (keyof typeof SECTION_PREFIX)[]) {
    const answers = draft[section] as Record<string, unknown> | undefined;
    if (!answers) {
      continue;
    }
    for (const [property, value] of Object.entries(answers)) {
      const mapped = ccdValue(value);
      if (mapped !== undefined) {
        data[ccdFieldId(section, property)] = mapped;
      }
    }
  }

  const evidence = evidenceCollection(draft.supportingEvidence);
  if (evidence.length > 0) {
    data.SupportingEvidence = evidence;
  }

  return data;
}

function ccdValue(value: unknown): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (Array.isArray(value)) {
    // CCD's MultiSelectList takes the codes as an array; an empty selection is no answer.
    return value.length > 0 ? value : undefined;
  }

  if (typeof value === "object") {
    return isDateAnswer(value) ? isoDate(value) : ccdAddress(value as Address);
  }

  return typeof value === "string" ? value.trim() || undefined : value;
}

function isDateAnswer(value: object): value is DateAnswer {
  return "day" in value || "month" in value || "year" in value;
}

/** CCD wants an ISO date. A part-typed date is not a date, so it is omitted. */
export function isoDate(date: DateAnswer): string | undefined {
  const { day, month, year } = date;
  if (!day || !month || !year) {
    return undefined;
  }
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/**
 * CCD's AddressGlobalUK complex type, not our internal record: the sub-field names
 * differ (`PostTown`, `PostCode`) and CCD is case-sensitive about them.
 */
function ccdAddress(address: Address): Record<string, string> | undefined {
  const mapped = {
    AddressLine1: address.addressLine1,
    AddressLine2: address.addressLine2,
    PostTown: address.townOrCity,
    County: address.county,
    PostCode: address.postcode
  };
  const present = Object.entries(mapped).filter((entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== "");
  return present.length > 0 ? Object.fromEntries(present) : undefined;
}

/**
 * The supporting-evidence table as a CCD collection.
 *
 * A collection is a list of `{ id, value }`; `id` is null for rows CCD has not seen
 * before, which is every row on a create.
 */
function evidenceCollection(rows: EvidenceRow[]): { id: null; value: Record<string, unknown> }[] {
  return rows
    .map((row) => ({
      EvidenceDescription: row.evidenceDescription?.trim() || undefined,
      SignedBy: row.signedBy?.trim() || undefined,
      DocumentDate: row.documentDate ? isoDate(row.documentDate) : undefined,
      PageCount: row.pageCount?.trim() || undefined
    }))
    .map((value) => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)))
    .filter((value) => Object.keys(value).length > 0)
    .map((value) => ({ id: null, value }));
}
