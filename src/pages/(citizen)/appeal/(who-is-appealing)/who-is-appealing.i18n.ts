/**
 * Content for who-is-appealing.
 *
 * SEND35 question 2.1. The three routes carry different eligibility rules, so this is
 * asked first: it decides who may appeal at all and which declaration applies at the end.
 */
export const en = {
  title: "Who is making the appeal?",
  whoIsAppealingLabel: "Who is making the appeal?",
  whoIsAppealingOptions: [
    {
      value: "parentOrCarer",
      text: "I am appealing for a child, as their parent or carer",
      hint: "The child is aged 0 to 16."
    },
    {
      value: "youngPerson",
      text: "I am appealing for myself, as a young person",
      hint: "You must be over compulsory school age and under 25. Compulsory school age lasts until the end of the academic year in which you turn 16."
    },
    {
      value: "alternativePerson",
      text: "I am appealing on behalf of a young person who cannot appeal themselves",
      hint: "For example, as their parent, a court of protection deputy, or someone with lasting power of attorney."
    }
  ],
  errors: {
    whoIsAppealingRequired: "Select who is making the appeal"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
