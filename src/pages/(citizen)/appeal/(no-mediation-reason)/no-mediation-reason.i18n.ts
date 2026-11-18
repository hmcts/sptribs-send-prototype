/**
 * Content for no-mediation-reason.
 *
 * SEND35 question 12.2.
 */
export const en = {
  title: "Why do you not have a mediation certificate?",
  caption: "Mediation and deadlines",
  noCertificateReasonLabel: "Why do you not have a mediation certificate?",
  noCertificateReasonOptions: [
    {
      value: "sectionIOnly",
      text: "My appeal is only about which school, college or education provider the child or young person should attend",
      hint: "You do not need a mediation certificate for a Section I-only appeal."
    },
    {
      value: "otherReason",
      text: "Another reason"
    }
  ],
  errors: {
    noCertificateReasonRequired: "Select why you do not have a mediation certificate"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
