/**
 * Content for who-receives-information.
 *
 * SEND35 question 6.1. The tribunal writes to one person only for the whole appeal, and
 * it must be somebody already named on the form.
 */
export const en = {
  title: "Who should the tribunal send information to?",
  caption: "Other people involved",
  recipientLabel: "Who should the tribunal send information to?",
  recipientHint: "The tribunal will send information about the appeal to one person only. It must be someone you have named on this appeal.",
  recipientOptions: [
    {
      value: "parentOrCarer",
      text: "The named parent or carer"
    },
    {
      value: "youngPerson",
      text: "The young person the appeal is about"
    },
    {
      value: "representative",
      text: "The named representative"
    },
    {
      value: "advocate",
      text: "The named advocate"
    },
    {
      value: "alternativePerson",
      text: "The alternative person"
    }
  ],
  errors: {
    recipientRequired: "Select who the tribunal should send information to"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
