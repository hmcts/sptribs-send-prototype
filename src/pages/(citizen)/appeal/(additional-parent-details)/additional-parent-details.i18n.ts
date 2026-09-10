/**
 * Content for additional-parent-details.
 *
 * SEND35 question 3.1.
 */
export const en = {
  title: "Details of the other parent or carer",
  caption: "Other people involved",
  heading: "Details of the other parent or carer",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  relationshipLabel: "Their relationship to the child or young person",
  phoneNumberLabel: "Phone number (optional)",
  emailAddressLabel: "Email address (optional)",
  errors: {
    firstNameRequired: "Enter their first name",
    firstNameTooLong: "First name must be 100 characters or fewer",
    lastNameRequired: "Enter their last name",
    lastNameTooLong: "Last name must be 100 characters or fewer",
    relationshipRequired: "Enter their relationship to the child or young person",
    relationshipTooLong: "Relationship must be 100 characters or fewer",
    phoneNumberTooLong: "Phone number must be 30 characters or fewer",
    emailAddressInvalid: "Enter an email address in the correct format, like name@example.com",
    emailAddressTooLong: "Email address must be 255 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
