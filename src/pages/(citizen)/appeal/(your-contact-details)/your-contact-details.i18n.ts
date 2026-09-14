/**
 * Content for your-contact-details.
 *
 * SEND35 question 2.2.
 */
export const en = {
  title: "What are your contact details?",
  caption: "About you",
  heading: "What are your contact details?",
  phoneNumberLabel: "Phone number",
  emailAddressLabel: "Email address",
  errors: {
    phoneNumberRequired: "Enter your phone number",
    phoneNumberTooLong: "Phone number must be 30 characters or fewer",
    emailAddressRequired: "Enter your email address",
    emailAddressInvalid: "Enter an email address in the correct format, like name@example.com",
    emailAddressTooLong: "Email address must be 255 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
