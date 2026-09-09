/**
 * Content for your-name.
 *
 * SEND35 question 2.2. Title is not asked: the Design System says to collect only what
 * is needed, and the tribunal does not need one to process an appeal.
 */
export const en = {
  title: "What is your name?",
  caption: "About you",
  heading: "What is your name?",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  errors: {
    firstNameRequired: "Enter your first name",
    firstNameTooLong: "First name must be 100 characters or fewer",
    lastNameRequired: "Enter your last name",
    lastNameTooLong: "Last name must be 100 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
