/**
 * Content for parental-responsibility-details.
 *
 * SEND35 questions 7.2 and 7.3. If they have not been told, the tribunal needs the
 * reason — so the explanation is required rather than optional.
 */
export const en = {
  title: "The other person or organisation with parental responsibility",
  caption: "Other people involved",
  heading: "The other person or organisation with parental responsibility",
  nameLabel: "Name of the person or organisation",
  toldLabel: "Have you told them about this appeal?",
  toldOptions: [
    {
      value: "Yes",
      text: "Yes"
    },
    {
      value: "No",
      text: "No"
    }
  ],
  reasonNotToldLabel: "If you have not told them, explain why",
  errors: {
    nameRequired: "Enter the name of the person or organisation",
    nameTooLong: "Name must be 255 characters or fewer",
    toldRequired: "Select yes if you have told them about this appeal"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
