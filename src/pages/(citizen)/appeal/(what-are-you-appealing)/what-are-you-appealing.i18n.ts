/**
 * Content for what-are-you-appealing.
 *
 * SEND35 question 8.1. More than one may apply, so checkboxes. The decision letter is
 * named as the place to check, because that is where the answer is.
 */
export const en = {
  title: "What are you appealing about?",
  caption: "What you are appealing",
  appealAboutLabel: "What are you appealing about?",
  appealAboutHint: "Select all that apply. Check the decision letter from the local authority if you are not sure.",
  appealAboutOptions: [
    {
      value: "refusedToMakePlan",
      text: "The local authority refused to make an EHC plan"
    },
    {
      value: "refusedReassessment",
      text: "The local authority refused to secure a reassessment of EHC needs"
    },
    {
      value: "planContent",
      text: "I disagree with something written in Section B, F or I of the EHC plan"
    },
    {
      value: "planNoLongerNecessary",
      text: "The local authority decided a plan is no longer necessary"
    }
  ],
  errors: {
    appealAboutRequired: "Select what you are appealing about"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
