/**
 * Content for advocate-details.
 *
 * SEND35 questions 5.2 and 5.3.
 */
export const en = {
  title: "Details of your advocate",
  caption: "Other people involved",
  heading: "Details of your advocate",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  phoneNumberLabel: "Phone number",
  emailAddressLabel: "Email address",
  errors: {
    firstNameRequired: "Enter your advocate's first name",
    firstNameTooLong: "First name must be 100 characters or fewer",
    lastNameRequired: "Enter your advocate's last name",
    lastNameTooLong: "Last name must be 100 characters or fewer",
    phoneNumberRequired: "Enter your advocate's phone number",
    phoneNumberTooLong: "Phone number must be 30 characters or fewer",
    emailAddressRequired: "Enter your advocate's email address",
    emailAddressInvalid: "Enter an email address in the correct format, like name@example.com",
    emailAddressTooLong: "Email address must be 255 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
