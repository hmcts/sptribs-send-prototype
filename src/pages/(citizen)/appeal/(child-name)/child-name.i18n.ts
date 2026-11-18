/**
 * Content for child-name.
 *
 * SEND35 question 1.1. Two inputs on one page: the Design System asks for a name in
 * separate first and last name fields, and they are one question.
 */
export const en = {
  title: "What is the child or young person's name?",
  caption: "The child or young person",
  heading: "What is their name?",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  errors: {
    firstNameRequired: "Enter their first name",
    firstNameTooLong: "First name must be 100 characters or fewer",
    lastNameRequired: "Enter their last name",
    lastNameTooLong: "Last name must be 100 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
