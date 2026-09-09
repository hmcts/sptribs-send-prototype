/**
 * Content for other-court-case-details.
 *
 * SEND35 question 15.1.
 */
export const en = {
  title: "Tell the tribunal about the other case",
  caption: "Other cases",
  courtCaseDetailsLabel: "Tell the tribunal about the other case",
  courtCaseDetailsHint: "Give the name of the case, a short description, and any orders that have been made.",
  errors: {
    courtCaseDetailsRequired: "Tell the tribunal about the other case"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
