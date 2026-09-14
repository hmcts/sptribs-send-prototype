/**
 * Content for school-address.
 *
 * SEND35 question 9.4.
 */
export const en = {
  title: "What is their address?",
  caption: "The school, college or education provider",
  providerAddressLabel: "What is their address?",
  errors: {
    providerAddressAddressLine1Required: "Enter the first line of the address",
    providerAddressAddressLine1TooLong: "Address line 1 must be 100 characters or fewer",
    providerAddressAddressLine2TooLong: "Address line 2 must be 100 characters or fewer",
    providerAddressTownOrCityRequired: "Enter the town or city",
    providerAddressTownOrCityTooLong: "Town or city must be 100 characters or fewer",
    providerAddressCountyTooLong: "County must be 100 characters or fewer",
    providerAddressPostcodeRequired: "Enter the postcode",
    providerAddressPostcodeTooLong: "Postcode must be 10 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
