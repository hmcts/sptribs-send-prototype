/**
 * Content for annual-review.
 *
 * SEND35 question 8.2.
 */
export const en = {
  title: "Is this appeal following an annual review of an EHC plan?",
  caption: "What you are appealing",
  followingAnnualReviewLabel: "Is this appeal following an annual review of an EHC plan?",
  followingAnnualReviewOptions: [
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
    followingAnnualReviewRequired: "Select yes if this appeal follows an annual review"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
