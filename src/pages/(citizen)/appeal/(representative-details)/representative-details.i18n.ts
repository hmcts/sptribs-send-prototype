/**
 * Content for representative-details.
 *
 * SEND35 questions 4.2 and 4.3.
 */
export const en = {
  title: "Details of your representative",
  caption: "Other people involved",
  heading: "Details of your representative",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  companyNameLabel: "Company or organisation (optional)",
  phoneNumberLabel: "Phone number",
  emailAddressLabel: "Email address",
  errors: {
    firstNameRequired: "Enter your representative's first name",
    firstNameTooLong: "First name must be 100 characters or fewer",
    lastNameRequired: "Enter your representative's last name",
    lastNameTooLong: "Last name must be 100 characters or fewer",
    companyNameTooLong: "Company or organisation must be 100 characters or fewer",
    phoneNumberRequired: "Enter your representative's phone number",
    phoneNumberTooLong: "Phone number must be 30 characters or fewer",
    emailAddressRequired: "Enter your representative's email address",
    emailAddressInvalid: "Enter an email address in the correct format, like name@example.com",
    emailAddressTooLong: "Email address must be 255 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
