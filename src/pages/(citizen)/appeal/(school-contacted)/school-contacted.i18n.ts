/**
 * Content for school-contacted.
 *
 * SEND35 question 9.5. Any way of contacting them counts — phone, letter, email or
 * anything else — which is why the hint says so.
 */
export const en = {
  title: "When did you contact them?",
  caption: "The school, college or education provider",
  dateContactedLabel: "When did you contact them?",
  dateContactedHint: "This can be by phone, letter, email or any other way. For example, 27 3 2026",
  errors: {
    dateContactedRequired: "Enter the date you contacted them",
    dateContactedInvalid: "The date you contacted them must be a real date"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
