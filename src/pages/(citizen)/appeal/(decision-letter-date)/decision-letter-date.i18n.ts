/**
 * Content for decision-letter-date.
 *
 * SEND35 question 13.1. This is the date the two-month time limit runs from, so it is
 * asked before the mediation questions rather than after them.
 */
export const en = {
  title: "What is the date on the local authority's decision letter?",
  caption: "Mediation and deadlines",
  decisionLetterDateLabel: "What is the date on the local authority's decision letter?",
  decisionLetterDateHint: "You must usually appeal within 2 months of this date. For example, 27 3 2026",
  errors: {
    decisionLetterDateRequired: "Enter the date on the decision letter",
    decisionLetterDateInvalid: "The date on the decision letter must be a real date"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
