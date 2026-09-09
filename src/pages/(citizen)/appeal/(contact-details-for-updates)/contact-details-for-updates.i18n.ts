/**
 * Content for contact-details-for-updates.
 *
 * SEND35 questions 6.2 and 6.3. The mobile number is optional and its purpose is stated,
 * because the tribunal may text about the appeal.
 */
export const en = {
  title: "Contact details for updates about the appeal",
  caption: "Other people involved",
  heading: "Contact details for updates about the appeal",
  firstNameLabel: "First name",
  lastNameLabel: "Last name",
  mobileNumberLabel: "Mobile phone number (optional)",
  mobileNumberHint: "The tribunal may call or text this number about the appeal.",
  emailAddressLabel: "Email address",
  errors: {
    firstNameRequired: "Enter their first name",
    firstNameTooLong: "First name must be 100 characters or fewer",
    lastNameRequired: "Enter their last name",
    lastNameTooLong: "Last name must be 100 characters or fewer",
    mobileNumberTooLong: "Mobile phone number must be 30 characters or fewer",
    emailAddressRequired: "Enter their email address",
    emailAddressInvalid: "Enter an email address in the correct format, like name@example.com",
    emailAddressTooLong: "Email address must be 255 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
