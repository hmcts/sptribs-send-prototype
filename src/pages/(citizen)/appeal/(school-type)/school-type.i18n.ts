/**
 * Content for school-type.
 *
 * SEND35 question 9.3. The prompts come straight from the note beside that question on
 * the paper form, which is the only guidance most people get.
 */
export const en = {
  title: "What type of school, college or education provider do you want?",
  caption: "The school, college or education provider",
  typeOfProviderLabel: "What type of school, college or education provider do you want?",
  typeOfProviderHint:
    "You could mention the main type of support they provide, the size of the school or college, the size of classes, or access to facilities for disabled people.",
  errors: {
    typeOfProviderRequired: "Describe the type of school, college or education provider you want"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
