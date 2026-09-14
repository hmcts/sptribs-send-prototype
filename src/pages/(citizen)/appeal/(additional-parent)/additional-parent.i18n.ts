/**
 * Content for additional-parent.
 *
 * SEND35 section 3. The tribunal can be told about other parents or carers so they are
 * kept informed; it is not the same as naming a representative.
 */
export const en = {
  title: "Do you want to add another parent or carer?",
  caption: "Other people involved",
  addParentOrCarerLabel: "Do you want to add another parent or carer?",
  addParentOrCarerHint: "You can add up to two.",
  addParentOrCarerOptions: [
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
    addParentOrCarerRequired: "Select yes if you want to add another parent or carer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
