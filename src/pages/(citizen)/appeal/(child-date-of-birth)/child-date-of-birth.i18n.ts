/**
 * Content for child-date-of-birth.
 *
 * SEND35 question 1.1. The tribunal uses the date of birth to work out whether anyone
 * else holds parental responsibility that has to be declared (under 18) and whether a
 * young person may appeal alone.
 */
export const en = {
  title: "What is their date of birth?",
  caption: "The child or young person",
  dateOfBirthLabel: "What is their date of birth?",
  dateOfBirthHint: "For example, 27 3 2007",
  errors: {
    dateOfBirthRequired: "Enter their date of birth",
    dateOfBirthInvalid: "Their date of birth must be a real date"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
