/**
 * Content for parental-responsibility.
 *
 * SEND35 section 7. The examples matter: people routinely answer no because they are
 * thinking only of parents.
 */
export const en = {
  title: "Does anyone else have parental responsibility?",
  caption: "Other people involved",
  otherPersonOrOrganisationLabel: "Does anyone else have parental responsibility for the child or young person?",
  otherPersonOrOrganisationHint: "This could be a social worker, a foster parent, the local authority, a parent who is not present, or another family member.",
  otherPersonOrOrganisationOptions: [
    {
      value: "Yes",
      text: "Yes"
    },
    {
      value: "No",
      text: "No"
    }
  ],
  errors: {
    otherPersonOrOrganisationRequired: "Select yes if anyone else has parental responsibility"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
