/**
 * Content for school-requested.
 *
 * SEND35 question 9.2.
 */
export const en = {
  title: "Have you asked for a specific school, college or education provider?",
  caption: "The school, college or education provider",
  askedForProviderLabel: "Have you asked for a specific school, college or education provider?",
  askedForProviderOptions: [
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
    askedForProviderRequired: "Select yes if you have asked for a specific school, college or education provider"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
