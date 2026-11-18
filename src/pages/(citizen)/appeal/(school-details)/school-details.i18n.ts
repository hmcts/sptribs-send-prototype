/**
 * Content for school-details.
 *
 * SEND35 question 9.4. First choice only, as the paper form's note says.
 */
export const en = {
  title: "Which school, college or education provider did you ask for?",
  caption: "The school, college or education provider",
  providerNameLabel: "Which school, college or education provider did you ask for?",
  providerNameHint: "Tell us your first choice.",
  errors: {
    providerNameRequired: "Enter the name of the school, college or education provider",
    providerNameTooLong: "Name must be 255 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
