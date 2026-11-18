/**
 * Content for school-disagreement.
 *
 * SEND35 question 9.1. Only reached when Section I is being appealed.
 */
export const en = {
  title: "What do you disagree with about Section I?",
  caption: "The school, college or education provider",
  sectionIDisagreementLabel: "What do you disagree with about Section I?",
  sectionIDisagreementOptions: [
    {
      value: "disagreeWithNamed",
      text: "I disagree with the school, college or education provider named in the plan"
    },
    {
      value: "noneNamed",
      text: "The local authority has not named a school, college or education provider"
    }
  ],
  errors: {
    sectionIDisagreementRequired: "Select what you disagree with about Section I"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
