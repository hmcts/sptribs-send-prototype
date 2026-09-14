import { describe, expect, it } from "vitest";
import { caseDataFrom, ccdFieldId, isoDate } from "./case-data.js";
import { emptyDraft } from "./types.js";

/**
 * The field ids in `StSend35CaseData` (`sptribs-case-api`), as the CCD definition emits
 * them. Pinned here because this is the one place the two repos have to agree, and the
 * failure mode when they do not is not subtle: CCD validates every key against the case
 * type and rejects the whole submission on the first one it does not recognise, so a
 * single wrong id loses the entire appeal.
 *
 * If a question moves, this list is the thing to reconcile — regenerate it with
 * `./gradlew generateCCDConfig` in sptribs-case-api and read
 * `build/definitions/StSend35/CaseField.json`.
 */
const CASE_TYPE_FIELDS = new Set([
  "cypFirstName",
  "cypLastName",
  "cypDateOfBirth",
  "cypGender",
  "appellantWhoIsAppealing",
  "appellantFirstName",
  "appellantLastName",
  "appellantRelationship",
  "appellantPhoneNumber",
  "appellantEmailAddress",
  "appellantAddress",
  "parentsAddParentOrCarer",
  "parentsFirstName",
  "parentsLastName",
  "parentsPhoneNumber",
  "parentsEmailAddress",
  "parentsRelationship",
  "parentsAddSecondParentOrCarer",
  "parentsSecondFirstName",
  "parentsSecondLastName",
  "parentsSecondPhoneNumber",
  "parentsSecondEmailAddress",
  "parentsSecondRelationship",
  "repHasRepresentative",
  "repFirstName",
  "repLastName",
  "repCompanyName",
  "repPhoneNumber",
  "repEmailAddress",
  "advHasAdvocate",
  "advFirstName",
  "advLastName",
  "advPhoneNumber",
  "advEmailAddress",
  "commsRecipient",
  "commsFirstName",
  "commsLastName",
  "commsMobileNumber",
  "commsEmailAddress",
  "commsAddress",
  "prOtherPersonOrOrganisation",
  "prName",
  "prTold",
  "prReasonNotTold",
  "appealAppealAbout",
  "appealFollowingAnnualReview",
  "appealPlanSections",
  "schoolSectionIDisagreement",
  "schoolAskedForProvider",
  "schoolTypeOfProvider",
  "schoolProviderName",
  "schoolProviderAddress",
  "schoolDateContacted",
  "schoolProviderResponse",
  "reasonsAppealReasons",
  "hscWantRecommendation",
  "hscRecommendationTypes",
  "hscHealthIssues",
  "hscHealthRecommendations",
  "hscSocialCareIssues",
  "hscSocialCareRecommendations",
  "medHasCertificate",
  "medNoCertificateReason",
  "medNoCertificateExplanation",
  "timeDecisionLetterDate",
  "timeMediationCertificateDate",
  "timeLateAppealExplanation",
  "otherOtherSendAppeals",
  "otherAppealReferenceNumbers",
  "otherOtherCourtCases",
  "otherCourtCaseDetails",
  "hearingPreferredType",
  "hearingWantEarlierHearing",
  "hearingCanAttendByVideo",
  "hearingCannotAttendByVideoReason",
  "supportNeedsInterpreter",
  "supportLanguages",
  "supportNeedsAdjustments",
  "supportAdjustmentsDetail",
  "declCapacity",
  "declSignatoryRole",
  "declFullName",
  "declSignature",
  "declDateSigned",
  "SupportingEvidence"
]);

/** Every answer filled in, so the mapping is exercised against the whole case type. */
function fullDraft() {
  const draft = emptyDraft();
  draft.childOrYoungPerson = { firstName: "Amara", lastName: "Okonjo", dateOfBirth: { day: "7", month: "3", year: "2012" }, gender: "female" };
  draft.appellant = {
    whoIsAppealing: "parentOrCarer",
    firstName: "Nkechi",
    lastName: "Okonjo",
    relationship: "Mother",
    phoneNumber: "07700 900123",
    emailAddress: "nkechi@example.com",
    address: { addressLine1: "12 Fern Road", addressLine2: "", townOrCity: "Leeds", county: "West Yorkshire", postcode: "LS1 4AB" }
  };
  draft.additionalParents = {
    addParentOrCarer: "Yes",
    firstName: "Tunde",
    lastName: "Okonjo",
    relationship: "Father",
    phoneNumber: "",
    emailAddress: "",
    addSecondParentOrCarer: "No"
  };
  draft.representative = { hasRepresentative: "No" };
  draft.advocate = { hasAdvocate: "No" };
  draft.communication = {
    recipient: "parentOrCarer",
    firstName: "Nkechi",
    lastName: "Okonjo",
    mobileNumber: "07700 900123",
    emailAddress: "nkechi@example.com",
    address: { addressLine1: "12 Fern Road", townOrCity: "Leeds", postcode: "LS1 4AB" }
  };
  draft.parentalResponsibility = { otherPersonOrOrganisation: "No" };
  draft.typeOfAppeal = { appealAbout: ["planContent"], followingAnnualReview: "Yes", planSections: ["sectionB", "sectionF"] };
  draft.schoolOrProvider = { sectionIDisagreement: "noneNamed", askedForProvider: "No", typeOfProvider: "A small specialist setting" };
  draft.reasons = { appealReasons: "The plan does not describe her speech and language needs." };
  draft.healthAndSocialCare = {
    wantRecommendation: "Yes",
    recommendationTypes: ["health"],
    healthIssues: "Speech therapy",
    healthRecommendations: "Weekly sessions"
  };
  draft.mediation = { hasCertificate: "Yes" };
  draft.timeliness = { decisionLetterDate: { day: "1", month: "2", year: "2026" }, mediationCertificateDate: { day: "20", month: "2", year: "2026" } };
  draft.otherCases = { otherSendAppeals: "No", otherCourtCases: "No" };
  draft.hearingPreferences = { preferredType: "attended", wantEarlierHearing: "Yes", canAttendByVideo: "Yes" };
  draft.support = { needsInterpreter: "No", needsAdjustments: "No" };
  draft.declaration = {
    capacity: "onBehalf",
    signatoryRole: "parentOrCarer",
    fullName: "Nkechi Okonjo",
    signature: "Nkechi Okonjo",
    dateSigned: { day: "3", month: "3", year: "2026" }
  };
  draft.supportingEvidence = [
    { evidenceDescription: "Speech therapist's report", signedBy: "R Patel", documentDate: { day: "21", month: "1", year: "2026" }, pageCount: "4" }
  ];
  return draft;
}

describe("ccdFieldId", () => {
  it("should be the section prefix plus the capitalised property", () => {
    expect(ccdFieldId("childOrYoungPerson", "firstName")).toBe("cypFirstName");
    expect(ccdFieldId("healthAndSocialCare", "socialCareRecommendations")).toBe("hscSocialCareRecommendations");
  });

  it("should keep the capital I in SectionIDisagreement", () => {
    expect(ccdFieldId("schoolOrProvider", "sectionIDisagreement")).toBe("schoolSectionIDisagreement");
  });
});

describe("caseDataFrom", () => {
  it("should only produce keys the case type declares", () => {
    for (const key of Object.keys(caseDataFrom(fullDraft()))) {
      expect(CASE_TYPE_FIELDS, `${key} is not a field on StSend35, so CCD would reject the whole appeal`).toContain(key);
    }
  });

  it("should map a fully answered appeal onto most of the case type", () => {
    const data = caseDataFrom(fullDraft());

    // Not all 86: a fully answered appeal still skips the questions its own answers rule
    // out, which is the point of the branching.
    expect(Object.keys(data).length).toBeGreaterThan(50);
    expect(data.cypFirstName).toBe("Amara");
    expect(data.appealAppealAbout).toEqual(["planContent"]);
    expect(data.appealPlanSections).toEqual(["sectionB", "sectionF"]);
  });

  it("should send dates as ISO, not as the three parts", () => {
    expect(caseDataFrom(fullDraft()).cypDateOfBirth).toBe("2012-03-07");
  });

  it("should send an address using CCD's own sub-field names", () => {
    expect(caseDataFrom(fullDraft()).appellantAddress).toEqual({
      AddressLine1: "12 Fern Road",
      PostTown: "Leeds",
      County: "West Yorkshire",
      PostCode: "LS1 4AB"
    });
  });

  it("should omit an unanswered question rather than send null", () => {
    const data = caseDataFrom(emptyDraft());

    expect(data).toEqual({});
  });

  it("should omit a half-typed date, because half a date is not a date", () => {
    const draft = emptyDraft();
    draft.childOrYoungPerson.dateOfBirth = { day: "7", month: "", year: "2012" };

    expect(caseDataFrom(draft)).not.toHaveProperty("cypDateOfBirth");
  });

  it("should send supporting evidence as a CCD collection", () => {
    expect(caseDataFrom(fullDraft()).SupportingEvidence).toEqual([
      {
        id: null,
        value: { EvidenceDescription: "Speech therapist's report", SignedBy: "R Patel", DocumentDate: "2026-01-21", PageCount: "4" }
      }
    ]);
  });

  it("should drop an evidence row the citizen left blank", () => {
    const draft = emptyDraft();
    draft.supportingEvidence = [{ evidenceDescription: "", signedBy: "", pageCount: "" }];

    expect(caseDataFrom(draft)).not.toHaveProperty("SupportingEvidence");
  });
});

describe("isoDate", () => {
  it("should pad a single-digit day and month", () => {
    expect(isoDate({ day: "7", month: "3", year: "2012" })).toBe("2012-03-07");
  });

  it("should return nothing for an incomplete date", () => {
    expect(isoDate({ day: "7", month: "3" })).toBeUndefined();
  });
});
