/**
 * Content for other-court-cases.
 *
 * SEND35 question 15.1. The family court is called out because it is the common case and
 * people do not always think of it as a court case.
 */
export const en = {
  title: "Is the child or young person involved in another court or tribunal case?",
  caption: "Other cases",
  otherCourtCasesLabel: "Is the child or young person involved in any other case in a court or tribunal?",
  otherCourtCasesHint: "This includes the family court.",
  otherCourtCasesOptions: [
    {
      value: "Yes",
      text: "Yes"
    },
    {
      value: "No",
      text: "No"
    }
  ],
  errors: {
    otherCourtCasesRequired: "Select yes if they are involved in another court or tribunal case"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
