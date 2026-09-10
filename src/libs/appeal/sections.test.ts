import { describe, expect, it } from "vitest";
import { applicableTasks, completedCount, readyToSubmit, sectionIOnly, TASK_GROUPS } from "./sections.js";
import { type AppealDraft, emptyDraft } from "./types.js";

const slugs = (draft: AppealDraft) => applicableTasks(draft).map((task) => task.slug);

describe("TASK_GROUPS", () => {
  it("should point every task at a page that exists", () => {
    // The slug is the URL under /appeal, so a typo here is a task list linking to a 404.
    // The route directories are (slug)/slug.ts, so the slug is also the directory name.
    for (const task of TASK_GROUPS.flatMap((group) => group.tasks)) {
      expect(task.slug).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("should not list the same task twice", () => {
    const all = TASK_GROUPS.flatMap((group) => group.tasks).map((task) => task.slug);

    expect(new Set(all).size).toBe(all.length);
  });
});

describe("applicableTasks", () => {
  it("should hide the plan-section questions on a refusal to make a plan", () => {
    // SEND35: there is no plan yet, so there is nothing in Sections B, F or I to disagree
    // with. Showing the task would be asking for an answer that cannot exist.
    const draft = emptyDraft();
    draft.typeOfAppeal.appealAbout = ["refusedToMakePlan"];

    expect(slugs(draft)).not.toContain("plan-sections");
    expect(slugs(draft)).not.toContain("annual-review");
  });

  it("should show the plan-section questions when the plan's content is disputed", () => {
    const draft = emptyDraft();
    draft.typeOfAppeal.appealAbout = ["planContent"];

    expect(slugs(draft)).toContain("plan-sections");
    expect(slugs(draft)).toContain("annual-review");
  });

  it("should show the school questions only when Section I is disputed", () => {
    const draft = emptyDraft();
    draft.typeOfAppeal.appealAbout = ["planContent"];
    draft.typeOfAppeal.planSections = ["sectionB"];
    expect(slugs(draft)).not.toContain("school-disagreement");

    draft.typeOfAppeal.planSections = ["sectionB", "sectionI"];
    expect(slugs(draft)).toContain("school-disagreement");
  });

  it("should not ask a young person appealing alone about their relationship to themselves", () => {
    const draft = emptyDraft();
    draft.appellant.whoIsAppealing = "youngPerson";

    expect(slugs(draft)).not.toContain("your-relationship");
  });

  it("should drop the mediation certificate for a Section I-only appeal", () => {
    // The one statutory exemption: an appeal only about which school, college or
    // education provider the child or young person should attend needs no certificate.
    const draft = emptyDraft();
    draft.typeOfAppeal.appealAbout = ["planContent"];
    draft.typeOfAppeal.planSections = ["sectionI"];

    expect(sectionIOnly(draft)).toBe(true);
    expect(slugs(draft)).not.toContain("mediation-certificate");
  });

  it("should keep the mediation certificate when Section I is one of several disputes", () => {
    const draft = emptyDraft();
    draft.typeOfAppeal.appealAbout = ["planContent"];
    draft.typeOfAppeal.planSections = ["sectionI", "sectionF"];

    expect(sectionIOnly(draft)).toBe(false);
    expect(slugs(draft)).toContain("mediation-certificate");
  });

  it("should still require the certificate when Section I is disputed alongside another ground", () => {
    const draft = emptyDraft();
    draft.typeOfAppeal.appealAbout = ["planContent", "planNoLongerNecessary"];
    draft.typeOfAppeal.planSections = ["sectionI"];

    expect(sectionIOnly(draft)).toBe(false);
  });
});

describe("readyToSubmit", () => {
  it("should be false for an empty appeal", () => {
    expect(readyToSubmit(emptyDraft())).toBe(false);
  });

  it("should not be blocked by having added no supporting evidence", () => {
    // SEND35 says the appeal form is not the last chance to send documents, so requiring
    // evidence up front would turn "you can also add" into a blocker.
    const draft = completeDraft();
    draft.supportingEvidence = [];

    expect(readyToSubmit(draft)).toBe(true);
  });

  it("should be true once every applicable task is answered", () => {
    expect(readyToSubmit(completeDraft())).toBe(true);
  });

  it("should become false again if an answer is cleared", () => {
    const draft = completeDraft();
    draft.reasons.appealReasons = "";

    expect(readyToSubmit(draft)).toBe(false);
  });
});

describe("completedCount", () => {
  it("should count only the tasks this appeal reaches", () => {
    const refusal = emptyDraft();
    refusal.typeOfAppeal.appealAbout = ["refusedToMakePlan"];

    const disputed = emptyDraft();
    disputed.typeOfAppeal.appealAbout = ["planContent"];
    disputed.typeOfAppeal.planSections = ["sectionI"];

    expect(completedCount(refusal).total).toBeLessThan(completedCount(disputed).total);
  });
});

/** A refusal-to-make-a-plan appeal with every applicable answer given. */
function completeDraft(): AppealDraft {
  const draft = emptyDraft();
  draft.typeOfAppeal = { appealAbout: ["refusedToMakePlan"] };
  draft.childOrYoungPerson = { firstName: "Amara", lastName: "Okonjo", dateOfBirth: { day: "7", month: "3", year: "2012" }, gender: "female" };
  draft.appellant = {
    whoIsAppealing: "parentOrCarer",
    firstName: "Nkechi",
    lastName: "Okonjo",
    relationship: "Mother",
    phoneNumber: "07700 900123",
    emailAddress: "nkechi@example.com",
    address: { addressLine1: "12 Fern Road", townOrCity: "Leeds", postcode: "LS1 4AB" }
  };
  draft.additionalParents = { addParentOrCarer: "No" };
  draft.representative = { hasRepresentative: "No" };
  draft.advocate = { hasAdvocate: "No" };
  draft.communication = { recipient: "parentOrCarer", emailAddress: "nkechi@example.com" };
  draft.parentalResponsibility = { otherPersonOrOrganisation: "No" };
  draft.reasons = { appealReasons: "She needs a plan." };
  draft.healthAndSocialCare = { wantRecommendation: "No" };
  draft.mediation = { hasCertificate: "Yes" };
  draft.timeliness = { decisionLetterDate: { day: "1", month: "2", year: "2026" } };
  draft.otherCases = { otherSendAppeals: "No", otherCourtCases: "No" };
  draft.hearingPreferences = { preferredType: "attended", wantEarlierHearing: "No", canAttendByVideo: "Yes" };
  draft.support = { needsInterpreter: "No", needsAdjustments: "No" };
  draft.documentsChecklist = { decisionLetter: true };
  draft.supportingEvidence = [{ evidenceDescription: "A report" }];
  return draft;
}
