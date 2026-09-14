/**
 * Content for contact-address-for-updates.
 *
 * SEND35 question 6.4.
 */
export const en = {
  title: "What address should the tribunal write to?",
  caption: "Other people involved",
  addressLabel: "What address should the tribunal write to?",
  errors: {
    addressAddressLine1Required: "Enter the first line of the address",
    addressAddressLine1TooLong: "Address line 1 must be 100 characters or fewer",
    addressAddressLine2TooLong: "Address line 2 must be 100 characters or fewer",
    addressTownOrCityRequired: "Enter the town or city",
    addressTownOrCityTooLong: "Town or city must be 100 characters or fewer",
    addressCountyTooLong: "County must be 100 characters or fewer",
    addressPostcodeRequired: "Enter the postcode",
    addressPostcodeTooLong: "Postcode must be 10 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
