import { timeLimit } from "./deadline.js";
import { applicableTasks } from "./sections.js";
import type { Address, AppealDraft, DateAnswer } from "./types.js";

/**
 * The appeal as summary-list rows, for check-your-answers.
 *
 * Built here rather than in the template so the wording of an answer is decided in one
 * place. The rule that matters: a citizen must see back exactly what they said, in the
 * words they chose it by. So a radio answer is shown as its option text, not its code,
 * and a code with no matching option shows as the code rather than silently as blank —
 * a missing label is a bug worth seeing.
 *
 * Every row carries a change link back to the page that asked the question, and every
 * change link says what it changes: "Change the child's date of birth", not "Change".
 */

export interface SummaryRow {
  key: string;
  value: string;
  href: string;
  /** Completes "Change …" for the visually hidden part of the link. */
  changes: string;
}

export interface SummarySection {
  title: string;
  rows: SummaryRow[];
}

const LABELS: Record<string, Record<string, string>> = {
  whoIsAppealing: {
    parentOrCarer: "Appealing for a child, as their parent or carer",
    youngPerson: "Appealing for myself, as a young person",
    alternativePerson: "Appealing on behalf of a young person who cannot appeal themselves"
  },
  gender: { female: "Female", male: "Male", other: "Other", preferNotToSay: "Prefer not to say" },
  recipient: {
    parentOrCarer: "The named parent or carer",
    youngPerson: "The young person the appeal is about",
    representative: "The named representative",
    advocate: "The named advocate",
    alternativePerson: "The alternative person"
  },
  appealAbout: {
    refusedToMakePlan: "The local authority refused to make an EHC plan",
    refusedReassessment: "The local authority refused to secure a reassessment of EHC needs",
    planContent: "I disagree with something written in Section B, F or I of the EHC plan",
    planNoLongerNecessary: "The local authority decided a plan is no longer necessary"
  },
  planSections: {
    sectionB: "Section B — special educational needs",
    sectionF: "Section F — educational help or provision",
    sectionI: "Section I — the school, college or education provider"
  },
  sectionIDisagreement: {
    disagreeWithNamed: "I disagree with the provider named in the plan",
    noneNamed: "The local authority has not named a provider"
  },
  recommendationTypes: { health: "Health", socialCare: "Social care" },
  noCertificateReason: {
    sectionIOnly: "My appeal is only about which school, college or education provider they should attend",
    otherReason: "Another reason"
  },
  preferredType: { attended: "A hearing I can attend by video or in person", paper: "A paper hearing" },
  capacity: {
    onBehalf: "I am completing this form on behalf of the child or young person",
    youngPersonAlone: "I am the young person applying alone"
  },
  signatoryRole: { parentOrCarer: "Parent or carer", youngPerson: "Young person", representative: "Representative" }
};

const NOT_ANSWERED = "Not answered";

export function summarise(draft: AppealDraft): SummarySection[] {
  const shown = new Set(applicableTasks(draft).map((task) => task.slug));
  const only = (slug: string, rows: SummaryRow[]): SummaryRow[] => (shown.has(slug) ? rows : []);

  const sections: SummarySection[] = [
    {
      title: "What you are appealing",
      rows: [
        ...only("what-are-you-appealing", [
          row("What you are appealing about", list(draft.typeOfAppeal.appealAbout, "appealAbout"), "what-are-you-appealing", "what you are appealing about")
        ]),
        ...only("plan-sections", [
          row(
            "Parts of the plan you disagree with",
            list(draft.typeOfAppeal.planSections, "planSections"),
            "plan-sections",
            "the parts of the plan you disagree with"
          )
        ]),
        ...only("annual-review", [
          row("Following an annual review", text(draft.typeOfAppeal.followingAnnualReview), "annual-review", "whether this follows an annual review")
        ]),
        ...only("school-disagreement", [
          row(
            "What you disagree with about Section I",
            label("sectionIDisagreement", draft.schoolOrProvider.sectionIDisagreement),
            "school-disagreement",
            "what you disagree with about Section I"
          ),
          row("Asked for a specific provider", text(draft.schoolOrProvider.askedForProvider), "school-requested", "whether you asked for a specific provider"),
          row("Provider you asked for", text(draft.schoolOrProvider.providerName), "school-details", "the provider you asked for"),
          row("Their address", address(draft.schoolOrProvider.providerAddress), "school-address", "the provider's address"),
          row("Date you contacted them", date(draft.schoolOrProvider.dateContacted), "school-contacted", "the date you contacted them"),
          row("Their response", text(draft.schoolOrProvider.providerResponse), "school-response", "their response"),
          row("Type of provider you want", text(draft.schoolOrProvider.typeOfProvider), "school-type", "the type of provider you want")
        ])
      ]
    },
    {
      title: "The child or young person",
      rows: [
        row("Name", joined([draft.childOrYoungPerson.firstName, draft.childOrYoungPerson.lastName]), "child-name", "their name"),
        row("Date of birth", date(draft.childOrYoungPerson.dateOfBirth), "child-date-of-birth", "their date of birth"),
        row("Gender", label("gender", draft.childOrYoungPerson.gender), "child-gender", "their gender")
      ]
    },
    {
      title: "About you",
      rows: [
        row("Who is appealing", label("whoIsAppealing", draft.appellant.whoIsAppealing), "who-is-appealing", "who is appealing"),
        row("Your name", joined([draft.appellant.firstName, draft.appellant.lastName]), "your-name", "your name"),
        ...only("your-relationship", [row("Your relationship to them", text(draft.appellant.relationship), "your-relationship", "your relationship to them")]),
        row("Phone number", text(draft.appellant.phoneNumber), "your-contact-details", "your phone number"),
        row("Email address", text(draft.appellant.emailAddress), "your-contact-details", "your email address"),
        row("Your address", address(draft.appellant.address), "your-address", "your address")
      ]
    },
    {
      title: "Other people involved",
      rows: [
        row("Another parent or carer", text(draft.additionalParents.addParentOrCarer), "additional-parent", "whether you are adding another parent or carer"),
        ...when(draft.additionalParents.addParentOrCarer === "Yes", [
          row(
            "Their name",
            joined([draft.additionalParents.firstName, draft.additionalParents.lastName]),
            "additional-parent-details",
            "the other parent or carer's name"
          )
        ]),
        row("A representative", text(draft.representative.hasRepresentative), "representative", "whether you have a representative"),
        ...when(draft.representative.hasRepresentative === "Yes", [
          row("Their name", joined([draft.representative.firstName, draft.representative.lastName]), "representative-details", "your representative's name")
        ]),
        row("An advocate", text(draft.advocate.hasAdvocate), "advocate", "whether you have an advocate"),
        ...when(draft.advocate.hasAdvocate === "Yes", [
          row("Their name", joined([draft.advocate.firstName, draft.advocate.lastName]), "advocate-details", "your advocate's name")
        ]),
        row("Tribunal should contact", label("recipient", draft.communication.recipient), "who-receives-information", "who the tribunal should contact"),
        row("Their email address", text(draft.communication.emailAddress), "contact-details-for-updates", "the contact email address"),
        row("Address to write to", address(draft.communication.address), "contact-address-for-updates", "the address the tribunal should write to"),
        row(
          "Anyone else with parental responsibility",
          text(draft.parentalResponsibility.otherPersonOrOrganisation),
          "parental-responsibility",
          "whether anyone else has parental responsibility"
        ),
        ...when(draft.parentalResponsibility.otherPersonOrOrganisation === "Yes", [
          row("Who they are", text(draft.parentalResponsibility.name), "parental-responsibility-details", "who else has parental responsibility"),
          row("Told about this appeal", text(draft.parentalResponsibility.told), "parental-responsibility-details", "whether they have been told")
        ])
      ]
    },
    {
      title: "Your reasons",
      rows: [
        row("Reasons for appealing", text(draft.reasons.appealReasons), "reasons", "your reasons for appealing"),
        row(
          "Health or social care recommendations",
          text(draft.healthAndSocialCare.wantRecommendation),
          "health-social-care",
          "whether you want health or social care recommendations"
        ),
        ...when(draft.healthAndSocialCare.wantRecommendation === "Yes", [
          row(
            "Recommendations about",
            list(draft.healthAndSocialCare.recommendationTypes, "recommendationTypes"),
            "recommendation-type",
            "what the recommendations are about"
          ),
          ...when((draft.healthAndSocialCare.recommendationTypes ?? []).includes("health"), [
            row("Health issues", text(draft.healthAndSocialCare.healthIssues), "health-issues", "the health issues"),
            row("Health recommendations", text(draft.healthAndSocialCare.healthRecommendations), "health-issues", "the health recommendations")
          ]),
          ...when((draft.healthAndSocialCare.recommendationTypes ?? []).includes("socialCare"), [
            row("Social care issues", text(draft.healthAndSocialCare.socialCareIssues), "social-care-issues", "the social care issues"),
            row(
              "Social care recommendations",
              text(draft.healthAndSocialCare.socialCareRecommendations),
              "social-care-issues",
              "the social care recommendations"
            )
          ])
        ])
      ]
    },
    {
      title: "Mediation and deadlines",
      rows: [
        row("Date on the decision letter", date(draft.timeliness.decisionLetterDate), "decision-letter-date", "the date on the decision letter"),
        row(
          "Date on the mediation certificate",
          date(draft.timeliness.mediationCertificateDate),
          "mediation-certificate-date",
          "the date on the mediation certificate"
        ),
        ...when(timeLimit(draft).outOfTime, [
          row("Why the appeal is late", text(draft.timeliness.lateAppealExplanation), "late-appeal-reason", "why the appeal is late")
        ]),
        ...only("mediation-certificate", [
          row("You have a mediation certificate", text(draft.mediation.hasCertificate), "mediation-certificate", "whether you have a mediation certificate"),
          ...when(draft.mediation.hasCertificate === "No", [
            row(
              "Why you do not have one",
              label("noCertificateReason", draft.mediation.noCertificateReason),
              "no-mediation-reason",
              "why you do not have a mediation certificate"
            ),
            ...when(draft.mediation.noCertificateReason === "otherReason", [
              row("Your explanation", text(draft.mediation.noCertificateExplanation), "no-mediation-explanation", "your explanation")
            ])
          ])
        ])
      ]
    },
    {
      title: "Other cases",
      rows: [
        row("Other SEND appeals", text(draft.otherCases.otherSendAppeals), "other-send-appeals", "whether there are other SEND appeals"),
        ...when(draft.otherCases.otherSendAppeals === "Yes", [
          row("Their reference numbers", text(draft.otherCases.appealReferenceNumbers), "other-send-appeal-references", "the other appeal reference numbers")
        ]),
        row("Other court or tribunal cases", text(draft.otherCases.otherCourtCases), "other-court-cases", "whether there are other court or tribunal cases"),
        ...when(draft.otherCases.otherCourtCases === "Yes", [
          row("The other case", text(draft.otherCases.courtCaseDetails), "other-court-case-details", "the other case")
        ])
      ]
    },
    {
      title: "The hearing and support you need",
      rows: [
        row("Hearing you would prefer", label("preferredType", draft.hearingPreferences.preferredType), "hearing-type", "the hearing you would prefer"),
        row(
          "An earlier hearing if one is available",
          text(draft.hearingPreferences.wantEarlierHearing),
          "earlier-hearing",
          "whether you want an earlier hearing"
        ),
        row("Can take part by video", text(draft.hearingPreferences.canAttendByVideo), "video-hearing", "whether you can take part by video"),
        ...when(draft.hearingPreferences.canAttendByVideo === "No", [
          row("Why not", text(draft.hearingPreferences.cannotAttendByVideoReason), "video-hearing-reason", "why you cannot take part by video")
        ]),
        row("Need an interpreter", text(draft.support.needsInterpreter), "interpreter", "whether you need an interpreter"),
        ...when(draft.support.needsInterpreter === "Yes", [row("Languages", text(draft.support.languages), "interpreter-languages", "the languages you need")]),
        row("Need reasonable adjustments", text(draft.support.needsAdjustments), "reasonable-adjustments", "whether you need reasonable adjustments"),
        ...when(draft.support.needsAdjustments === "Yes", [
          row("Adjustments you need", text(draft.support.adjustmentsDetail), "reasonable-adjustments-detail", "the adjustments you need")
        ])
      ]
    },
    {
      title: "Documents and evidence",
      rows: [
        row("Documents you are sending", documents(draft), "documents-checklist", "the documents you are sending"),
        row("Supporting evidence", evidence(draft), "supporting-evidence", "your supporting evidence")
      ]
    }
  ];

  return sections.filter((section) => section.rows.length > 0);
}

const when = (condition: boolean, rows: SummaryRow[]): SummaryRow[] => (condition ? rows : []);

function row(key: string, value: string, slug: string, changes: string): SummaryRow {
  return { key, value, href: `/appeal/${slug}`, changes };
}

const text = (value: string | undefined): string => (value?.trim() ? value.trim() : NOT_ANSWERED);

const joined = (parts: (string | undefined)[]): string => {
  const present = parts.map((part) => part?.trim()).filter(Boolean);
  return present.length > 0 ? present.join(" ") : NOT_ANSWERED;
};

const label = (group: string, code: string | undefined): string => (code ? (LABELS[group]?.[code] ?? code) : NOT_ANSWERED);

const list = (codes: string[] | undefined, group: string): string => (codes?.length ? codes.map((code) => label(group, code)).join("\n") : NOT_ANSWERED);

/** A date the citizen can recognise: 27 March 2007, not 2007-03-27. */
function date(value: DateAnswer | undefined): string {
  if (!value?.day || !value?.month || !value?.year) {
    return NOT_ANSWERED;
  }
  const month = Number(value.month);
  const name = MONTHS[month - 1];
  return name ? `${Number(value.day)} ${name} ${value.year}` : `${value.day}/${value.month}/${value.year}`;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const address = (value: Address | undefined): string => {
  const lines = [value?.addressLine1, value?.addressLine2, value?.townOrCity, value?.county, value?.postcode].map((line) => line?.trim()).filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : NOT_ANSWERED;
};

function documents(draft: AppealDraft): string {
  const names: string[] = [];
  if (draft.documentsChecklist.decisionLetter) {
    names.push("The local authority's decision letter");
  }
  if (draft.documentsChecklist.ehcPlan) {
    names.push("The final EHC plan");
  }
  if (draft.documentsChecklist.mediationCertificate) {
    names.push("The mediation certificate");
  }
  return names.length > 0 ? names.join("\n") : NOT_ANSWERED;
}

function evidence(draft: AppealDraft): string {
  if (draft.supportingEvidence.length === 0) {
    return "None added";
  }
  return draft.supportingEvidence.map((item) => item.evidenceDescription ?? "").join("\n");
}
