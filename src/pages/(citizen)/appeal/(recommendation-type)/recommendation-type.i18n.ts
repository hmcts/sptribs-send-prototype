/**
 * Content for recommendation-type.
 *
 * SEND35 question 11.2. Both can be selected.
 */
export const en = {
  title: "What should the tribunal make recommendations about?",
  caption: "Your reasons",
  recommendationTypesLabel: "What should the tribunal make recommendations about?",
  recommendationTypesHint: "Select all that apply.",
  recommendationTypesOptions: [
    {
      value: "health",
      text: "Health",
      hint: "If you have an EHC plan, health is in Sections C and G."
    },
    {
      value: "socialCare",
      text: "Social care",
      hint: "If you have an EHC plan, social care is in Sections D and H."
    }
  ],
  errors: {
    recommendationTypesRequired: "Select what the tribunal should make recommendations about"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
