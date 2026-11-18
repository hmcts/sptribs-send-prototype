/**
 * Content for interpreter.
 *
 * SEND35 question 17.1. Includes anyone supporting the appellant, not only the appellant.
 */
export const en = {
  title: "Do you need a spoken language interpreter?",
  caption: "Support you need",
  needsInterpreterLabel: "Do you, or anyone supporting you, need a spoken language interpreter?",
  needsInterpreterOptions: [
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
    needsInterpreterRequired: "Select yes if you need a spoken language interpreter"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
