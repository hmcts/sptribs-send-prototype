/**
 * The appeal a citizen is building, one property per SEND35 section.
 *
 * Everything is optional. A part-finished appeal is the normal state — the task list
 * exists precisely so somebody can answer the sections in any order and come back —
 * so the draft type cannot require anything. Completeness is decided by
 * `#appeal`'s section manifest, not by the type.
 *
 * The field names mirror the CCD model in `sptribs-case-api`
 * (`uk.gov.hmcts.sptribs.send35.model`) so that `caseDataFrom` is a mechanical
 * prefix-and-capitalise rather than a translation table nobody can check.
 */

export type WhoIsAppealing = "youngPerson" | "alternativePerson" | "parentOrCarer";

export type Gender = "female" | "male" | "other" | "preferNotToSay";

export type RecipientOfInformation = "youngPerson" | "advocate" | "representative" | "parentOrCarer" | "alternativePerson";

export type AppealType = "refusedToMakePlan" | "refusedReassessment" | "planContent" | "planNoLongerNecessary";

export type PlanSection = "sectionB" | "sectionF" | "sectionI";

export type SectionIDisagreement = "disagreeWithNamed" | "noneNamed";

export type RecommendationType = "health" | "socialCare";

export type NoMediationReason = "sectionIOnly" | "otherReason";

export type HearingType = "paper" | "attended";

export type DeclarationCapacity = "onBehalf" | "youngPersonAlone";

export type SignatoryRole = "parentOrCarer" | "youngPerson" | "representative";

export type YesOrNo = "Yes" | "No";

export interface Address {
  addressLine1?: string;
  addressLine2?: string;
  townOrCity?: string;
  county?: string;
  postcode?: string;
}

/** An ISO date, or the parts of one the citizen has typed so far. */
export interface DateAnswer {
  day?: string;
  month?: string;
  year?: string;
}

export interface EvidenceRow {
  evidenceDescription?: string;
  signedBy?: string;
  documentDate?: DateAnswer;
  pageCount?: string;
}

export interface AppealDraft {
  childOrYoungPerson: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: DateAnswer;
    gender?: Gender;
  };
  appellant: {
    whoIsAppealing?: WhoIsAppealing;
    firstName?: string;
    lastName?: string;
    relationship?: string;
    phoneNumber?: string;
    emailAddress?: string;
    address?: Address;
  };
  additionalParents: {
    addParentOrCarer?: YesOrNo;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    emailAddress?: string;
    relationship?: string;
    addSecondParentOrCarer?: YesOrNo;
    secondFirstName?: string;
    secondLastName?: string;
    secondPhoneNumber?: string;
    secondEmailAddress?: string;
    secondRelationship?: string;
  };
  representative: {
    hasRepresentative?: YesOrNo;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    phoneNumber?: string;
    emailAddress?: string;
  };
  advocate: {
    hasAdvocate?: YesOrNo;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    emailAddress?: string;
  };
  communication: {
    recipient?: RecipientOfInformation;
    firstName?: string;
    lastName?: string;
    mobileNumber?: string;
    emailAddress?: string;
    address?: Address;
  };
  parentalResponsibility: {
    otherPersonOrOrganisation?: YesOrNo;
    name?: string;
    told?: YesOrNo;
    reasonNotTold?: string;
  };
  typeOfAppeal: {
    appealAbout?: AppealType[];
    followingAnnualReview?: YesOrNo;
    planSections?: PlanSection[];
  };
  schoolOrProvider: {
    sectionIDisagreement?: SectionIDisagreement;
    askedForProvider?: YesOrNo;
    typeOfProvider?: string;
    providerName?: string;
    providerAddress?: Address;
    dateContacted?: DateAnswer;
    providerResponse?: string;
  };
  reasons: {
    appealReasons?: string;
  };
  healthAndSocialCare: {
    wantRecommendation?: YesOrNo;
    recommendationTypes?: RecommendationType[];
    healthIssues?: string;
    healthRecommendations?: string;
    socialCareIssues?: string;
    socialCareRecommendations?: string;
  };
  mediation: {
    hasCertificate?: YesOrNo;
    noCertificateReason?: NoMediationReason;
    noCertificateExplanation?: string;
  };
  timeliness: {
    decisionLetterDate?: DateAnswer;
    mediationCertificateDate?: DateAnswer;
    lateAppealExplanation?: string;
  };
  otherCases: {
    otherSendAppeals?: YesOrNo;
    appealReferenceNumbers?: string;
    otherCourtCases?: YesOrNo;
    courtCaseDetails?: string;
  };
  hearingPreferences: {
    preferredType?: HearingType;
    wantEarlierHearing?: YesOrNo;
    canAttendByVideo?: YesOrNo;
    cannotAttendByVideoReason?: string;
  };
  support: {
    needsInterpreter?: YesOrNo;
    languages?: string;
    needsAdjustments?: YesOrNo;
    adjustmentsDetail?: string;
  };
  declaration: {
    capacity?: DeclarationCapacity;
    signatoryRole?: SignatoryRole;
    fullName?: string;
    signature?: string;
    dateSigned?: DateAnswer;
  };
  supportingEvidence: EvidenceRow[];
  /** Ticked on the documents-checklist page; not sent to CCD. */
  documentsChecklist: {
    decisionLetter?: boolean;
    ehcPlan?: boolean;
    mediationCertificate?: boolean;
  };
}

/** The section keys, which are also the task-list group ids. */
export type AppealSection = keyof Omit<AppealDraft, "supportingEvidence" | "documentsChecklist">;

export function emptyDraft(): AppealDraft {
  return {
    childOrYoungPerson: {},
    appellant: {},
    additionalParents: {},
    representative: {},
    advocate: {},
    communication: {},
    parentalResponsibility: {},
    typeOfAppeal: {},
    schoolOrProvider: {},
    reasons: {},
    healthAndSocialCare: {},
    mediation: {},
    timeliness: {},
    otherCases: {},
    hearingPreferences: {},
    support: {},
    declaration: {},
    supportingEvidence: [],
    documentsChecklist: {}
  };
}
