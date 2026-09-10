/**
 * Content for other-send-appeals.
 *
 * SEND35 question 14.1. Siblings are included, which is easy to miss, so the question
 * says so rather than leaving it to a hint.
 */
export const en = {
  title: "Is anyone in the family involved in another SEND appeal?",
  caption: "Other cases",
  otherSendAppealsLabel: "Is the child, young person or any of their siblings involved in another SEND appeal?",
  otherSendAppealsOptions: [
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
    otherSendAppealsRequired: "Select yes if anyone is involved in another SEND appeal"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
