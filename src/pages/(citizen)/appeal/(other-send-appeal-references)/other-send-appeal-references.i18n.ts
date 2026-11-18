/**
 * Content for other-send-appeal-references.
 *
 * SEND35 question 14.1. The example is the paper form's own reference format.
 */
export const en = {
  title: "What are the other appeal reference numbers?",
  caption: "Other cases",
  appealReferenceNumbersLabel: "What are the other appeal reference numbers?",
  appealReferenceNumbersHint: "If there is more than one, separate them with commas. For example, EH123/23/00001, EH456/56/00002",
  errors: {
    appealReferenceNumbersRequired: "Enter the other appeal reference numbers",
    appealReferenceNumbersTooLong: "Appeal reference numbers must be 500 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
