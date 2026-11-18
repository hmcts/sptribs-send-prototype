/**
 * Content for advocate.
 *
 * SEND35 section 5. The difference from a representative is the point of the hint: an
 * advocate supports communication but cannot represent anyone at the hearing.
 */
export const en = {
  title: "Do you have an advocate?",
  caption: "Other people involved",
  hasAdvocateLabel: "Do you have an advocate?",
  hasAdvocateHint:
    "An advocate can be anyone who supports you in communicating with the tribunal. They cannot represent you at the hearing. You need their permission to name them.",
  hasAdvocateOptions: [
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
    hasAdvocateRequired: "Select yes if you have an advocate"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
