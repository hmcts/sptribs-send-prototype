import type { AppealDraft } from "./types.js";

/**
 * The task list, as data.
 *
 * This is a manifest, not a configuration service: it is a TypeScript module in the
 * same repo as the pages, type-checked against the draft, and the pages still own
 * their own routing through `BACK`/`NEXT` constants. It exists so that the task list
 * and check-your-answers are one component each reading one list, rather than two
 * hand-maintained copies of the same ordering that drift apart the first time a
 * question moves.
 *
 * `applies` is what makes the list honest. SEND35 branches hard — a refusal to make a
 * plan skips the plan-section questions entirely, a Section I-only appeal needs no
 * mediation certificate — and a task list that shows tasks the citizen must not
 * answer is worse than no task list.
 */
export interface Task {
  /** Path under /appeal, and the id used in the task list. */
  slug: string;
  title: string;
  /** True once this task has everything it needs. */
  complete: (draft: AppealDraft) => boolean;
  /** False when this appeal does not reach the task at all. */
  applies?: (draft: AppealDraft) => boolean;
}

export interface TaskGroup {
  id: string;
  title: string;
  tasks: Task[];
}

const answered = (value: unknown): boolean => {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(answered);
  }
  return true;
};

const dateAnswered = (date: { day?: string; month?: string; year?: string } | undefined): boolean => Boolean(date?.day && date?.month && date?.year);

/** True when the appeal disputes what an existing plan says. */
export const disputesPlanContent = (draft: AppealDraft): boolean =>
  (draft.typeOfAppeal.appealAbout ?? []).some((about) => about === "planContent" || about === "planNoLongerNecessary");

/** True when the appeal is about which school or college is named (Section I). */
export const disputesSectionI = (draft: AppealDraft): boolean => (draft.typeOfAppeal.planSections ?? []).includes("sectionI");

/**
 * True when Section I is the *only* thing being appealed.
 *
 * This is the mediation exemption: an appeal only about which school, college or
 * education provider the child or young person should attend needs no mediation
 * certificate.
 */
export const sectionIOnly = (draft: AppealDraft): boolean => {
  const about = draft.typeOfAppeal.appealAbout ?? [];
  const sections = draft.typeOfAppeal.planSections ?? [];
  return about.length === 1 && about[0] === "planContent" && sections.length === 1 && sections[0] === "sectionI";
};

export const TASK_GROUPS: TaskGroup[] = [
  {
    id: "about-the-appeal",
    title: "What you are appealing",
    tasks: [
      {
        slug: "what-are-you-appealing",
        title: "What you are appealing about",
        complete: (draft) => answered(draft.typeOfAppeal.appealAbout)
      },
      {
        slug: "annual-review",
        title: "Whether this follows an annual review",
        applies: disputesPlanContent,
        complete: (draft) => answered(draft.typeOfAppeal.followingAnnualReview)
      },
      {
        slug: "plan-sections",
        title: "The parts of the plan you disagree with",
        applies: (draft) => (draft.typeOfAppeal.appealAbout ?? []).includes("planContent"),
        complete: (draft) => answered(draft.typeOfAppeal.planSections)
      },
      {
        slug: "school-disagreement",
        title: "The school, college or education provider",
        applies: disputesSectionI,
        complete: (draft) => answered(draft.schoolOrProvider.sectionIDisagreement) && answered(draft.schoolOrProvider.askedForProvider)
      }
    ]
  },
  {
    id: "child-or-young-person",
    title: "The child or young person",
    tasks: [
      {
        slug: "child-name",
        title: "Their name",
        complete: (draft) => answered(draft.childOrYoungPerson.firstName) && answered(draft.childOrYoungPerson.lastName)
      },
      {
        slug: "child-date-of-birth",
        title: "Their date of birth",
        complete: (draft) => dateAnswered(draft.childOrYoungPerson.dateOfBirth)
      },
      {
        slug: "child-gender",
        title: "Their gender",
        complete: (draft) => answered(draft.childOrYoungPerson.gender)
      }
    ]
  },
  {
    id: "about-you",
    title: "About you",
    tasks: [
      {
        slug: "your-name",
        title: "Your name",
        complete: (draft) => answered(draft.appellant.firstName) && answered(draft.appellant.lastName)
      },
      {
        slug: "your-relationship",
        title: "Your relationship to the child or young person",
        applies: (draft) => draft.appellant.whoIsAppealing !== "youngPerson",
        complete: (draft) => answered(draft.appellant.relationship)
      },
      {
        slug: "your-contact-details",
        title: "Your contact details",
        complete: (draft) => answered(draft.appellant.phoneNumber) && answered(draft.appellant.emailAddress)
      },
      {
        slug: "your-address",
        title: "Your address",
        complete: (draft) =>
          answered(draft.appellant.address?.addressLine1) && answered(draft.appellant.address?.townOrCity) && answered(draft.appellant.address?.postcode)
      }
    ]
  },
  {
    id: "other-people",
    title: "Other people involved",
    tasks: [
      {
        slug: "additional-parent",
        title: "Another parent or carer",
        complete: (draft) => answered(draft.additionalParents.addParentOrCarer)
      },
      {
        slug: "representative",
        title: "A representative",
        complete: (draft) => answered(draft.representative.hasRepresentative)
      },
      {
        slug: "advocate",
        title: "An advocate",
        complete: (draft) => answered(draft.advocate.hasAdvocate)
      },
      {
        slug: "who-receives-information",
        title: "Who the tribunal should contact",
        complete: (draft) => answered(draft.communication.recipient) && answered(draft.communication.emailAddress)
      },
      {
        slug: "parental-responsibility",
        title: "Anyone else with parental responsibility",
        complete: (draft) => answered(draft.parentalResponsibility.otherPersonOrOrganisation)
      }
    ]
  },
  {
    id: "your-reasons",
    title: "Your reasons",
    tasks: [
      {
        slug: "reasons",
        title: "Why you are appealing",
        complete: (draft) => answered(draft.reasons.appealReasons)
      },
      {
        slug: "health-social-care",
        title: "Health and social care recommendations",
        complete: (draft) => answered(draft.healthAndSocialCare.wantRecommendation)
      }
    ]
  },
  {
    id: "mediation-and-deadlines",
    title: "Mediation and deadlines",
    tasks: [
      {
        slug: "decision-letter-date",
        title: "The date on the decision letter",
        complete: (draft) => dateAnswered(draft.timeliness.decisionLetterDate)
      },
      {
        slug: "mediation-certificate",
        title: "Your mediation certificate",
        applies: (draft) => !sectionIOnly(draft),
        complete: (draft) => answered(draft.mediation.hasCertificate)
      }
    ]
  },
  {
    id: "other-cases",
    title: "Other cases",
    tasks: [
      {
        slug: "other-send-appeals",
        title: "Other SEND appeals",
        complete: (draft) => answered(draft.otherCases.otherSendAppeals)
      },
      {
        slug: "other-court-cases",
        title: "Other court or tribunal cases",
        complete: (draft) => answered(draft.otherCases.otherCourtCases)
      }
    ]
  },
  {
    id: "hearing-and-support",
    title: "The hearing and support you need",
    tasks: [
      {
        slug: "hearing-type",
        title: "The type of hearing you would prefer",
        complete: (draft) =>
          answered(draft.hearingPreferences.preferredType) &&
          answered(draft.hearingPreferences.wantEarlierHearing) &&
          answered(draft.hearingPreferences.canAttendByVideo)
      },
      {
        slug: "interpreter",
        title: "An interpreter",
        complete: (draft) => answered(draft.support.needsInterpreter)
      },
      {
        slug: "reasonable-adjustments",
        title: "Reasonable adjustments",
        complete: (draft) => answered(draft.support.needsAdjustments)
      }
    ]
  },
  {
    id: "documents",
    title: "Documents and evidence",
    tasks: [
      {
        slug: "documents-checklist",
        title: "The documents you are sending",
        complete: (draft) => Boolean(draft.documentsChecklist.decisionLetter)
      },
      {
        slug: "supporting-evidence",
        title: "Your supporting evidence",
        complete: (draft) => draft.supportingEvidence.length > 0
      }
    ]
  }
];

/** The tasks that apply to this appeal, flattened. */
export function applicableTasks(draft: AppealDraft): Task[] {
  return TASK_GROUPS.flatMap((group) => group.tasks).filter((task) => task.applies?.(draft) ?? true);
}

/**
 * Whether the appeal can be submitted.
 *
 * Supporting evidence is excluded: SEND35 says the appeal form is not the last
 * chance to send documents, so requiring evidence up front would turn a "you can
 * also add" into a blocker.
 */
export function readyToSubmit(draft: AppealDraft): boolean {
  return applicableTasks(draft)
    .filter((task) => task.slug !== "supporting-evidence")
    .every((task) => task.complete(draft));
}

export function completedCount(draft: AppealDraft): { done: number; total: number } {
  const tasks = applicableTasks(draft);
  return { done: tasks.filter((task) => task.complete(draft)).length, total: tasks.length };
}
