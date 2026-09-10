import { describe, expect, it } from "vitest";
import { summarise } from "./summary.js";
import { type AppealDraft, emptyDraft } from "./types.js";

/**
 * Check-your-answers is where a citizen decides whether what they are about to send is
 * right, so the rule these tests hold is: they must see back exactly what they said, in
 * the words they chose it by. A row showing a stored code, or an answer silently missing,
 * is a citizen signing a declaration about something they cannot read.
 */

const rows = (draft: AppealDraft) => summarise(draft).flatMap((section) => section.rows);
const find = (draft: AppealDraft, key: string) => rows(draft).find((row) => row.key === key);

function refusalDraft(): AppealDraft {
  const draft = emptyDraft();
  draft.typeOfAppeal = { appealAbout: ["refusedToMakePlan"] };
  draft.childOrYoungPerson = { firstName: "Amara", lastName: "Okonjo", dateOfBirth: { day: "7", month: "3", year: "2012" }, gender: "female" };
  draft.appellant = {
    whoIsAppealing: "parentOrCarer",
    firstName: "Nkechi",
    lastName: "Okonjo",
    address: { addressLine1: "12 Fern Road", townOrCity: "Leeds", postcode: "LS1 4AB" }
  };
  return draft;
}

describe("summarise", () => {
  it("should show a radio answer as the words the citizen chose, not the stored code", () => {
    expect(find(refusalDraft(), "Gender")?.value).toBe("Female");
    expect(find(refusalDraft(), "Who is appealing")?.value).toBe("Appealing for a child, as their parent or carer");
  });

  it("should show a code with no label as the code, rather than as blank", () => {
    // A missing label is a bug. Rendering it as an empty row hides the bug and tells the
    // citizen they answered nothing; rendering the code is ugly and visible, which is what
    // is wanted.
    const draft = refusalDraft();
    draft.childOrYoungPerson.gender = "somethingElse" as never;

    expect(find(draft, "Gender")?.value).toBe("somethingElse");
  });

  it("should show a date as a person would write it", () => {
    expect(find(refusalDraft(), "Date of birth")?.value).toBe("7 March 2012");
  });

  it("should show an address as separate lines, skipping the ones left blank", () => {
    expect(find(refusalDraft(), "Your address")?.value).toBe("12 Fern Road\nLeeds\nLS1 4AB");
  });

  it("should say 'Not answered' rather than leave a gap", () => {
    expect(find(emptyDraft(), "Name")?.value).toBe("Not answered");
  });

  it("should join a multi-select answer one option per line", () => {
    const draft = refusalDraft();
    draft.typeOfAppeal = { appealAbout: ["planContent"], planSections: ["sectionB", "sectionF"] };

    expect(find(draft, "Parts of the plan you disagree with")?.value).toBe("Section B — special educational needs\nSection F — educational help or provision");
  });

  it("should give every row a change link that says what it changes", () => {
    // "Change" on its own is meaningless to anybody using a screen reader to move between
    // links, which is why the Design System asks for the visually hidden suffix.
    for (const row of rows(refusalDraft())) {
      expect(row.href, `${row.key} has no change link`).toMatch(/^\/appeal\/[a-z-]+$/);
      expect(row.changes, `${row.key}'s change link does not say what it changes`).toBeTruthy();
    }
  });

  it("should not show rows for questions this appeal never reaches", () => {
    // A refusal to make a plan has no plan to disagree with, so those rows must not appear
    // at all — showing them as "Not answered" would read as an omission.
    const keys = rows(refusalDraft()).map((row) => row.key);

    expect(keys).not.toContain("Parts of the plan you disagree with");
    expect(keys).not.toContain("What you disagree with about Section I");
  });

  it("should reveal the follow-up rows only once the answer that leads to them is given", () => {
    const draft = refusalDraft();
    expect(rows(draft).map((row) => row.key)).not.toContain("Their name");

    draft.representative = { hasRepresentative: "Yes", firstName: "Ada", lastName: "Nwosu" };
    expect(find(draft, "Their name")?.value).toBe("Ada Nwosu");
  });

  it("should ask about a late appeal only when the dates say it is late", () => {
    const draft = refusalDraft();
    draft.timeliness = { decisionLetterDate: { day: "1", month: "1", year: "2020" } };

    expect(rows(draft).map((row) => row.key)).toContain("Why the appeal is late");
  });

  it("should list the documents being sent, and say when no evidence was added", () => {
    const draft = refusalDraft();
    draft.documentsChecklist = { decisionLetter: true, mediationCertificate: true };

    expect(find(draft, "Documents you are sending")?.value).toBe("The local authority's decision letter\nThe mediation certificate");
    expect(find(draft, "Supporting evidence")?.value).toBe("None added");
  });

  it("should list the evidence that was added", () => {
    const draft = refusalDraft();
    draft.supportingEvidence = [{ evidenceDescription: "A speech therapist's report" }, { evidenceDescription: "A school report" }];

    expect(find(draft, "Supporting evidence")?.value).toBe("A speech therapist's report\nA school report");
  });

  it("should keep a section down to only the rows that apply", () => {
    // "What you are appealing" always has the first question, but for a refusal to make a
    // plan the seven plan and school rows that follow it do not apply — so the section
    // survives with one row rather than eight.
    const section = summarise(refusalDraft()).find((candidate) => candidate.title === "What you are appealing");

    expect(section?.rows.map((row) => row.key)).toEqual(["What you are appealing about"]);
  });
});
