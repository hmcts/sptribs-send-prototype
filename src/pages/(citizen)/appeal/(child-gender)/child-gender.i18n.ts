/**
 * Content for child-gender.
 *
 * SEND35 question 1.1, which is free text on the paper form. Offering options with a
 * "prefer not to say" follows the Design System's guidance on asking about gender and
 * keeps the answer usable; the deviation is recorded in docs/service-design.md.
 */
export const en = {
  title: "What is their gender?",
  caption: "The child or young person",
  genderLabel: "What is their gender?",
  genderOptions: [
    {
      value: "female",
      text: "Female"
    },
    {
      value: "male",
      text: "Male"
    },
    {
      value: "other",
      text: "Other"
    },
    {
      value: "preferNotToSay",
      text: "Prefer not to say"
    }
  ],
  errors: {
    genderRequired: "Select their gender"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
