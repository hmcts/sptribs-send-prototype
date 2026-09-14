/**
 * Content for mediation-certificate.
 *
 * SEND35 section 12. The two things people get wrong are that you do not have to attend
 * a meeting, and that you still need the certificate — both are in the hint.
 */
export const en = {
  title: "Do you have a mediation certificate?",
  caption: "Mediation and deadlines",
  detailsSummary: "How to get a mediation certificate",
  detailsText:
    "The decision letter from the local authority has the contact details for your local mediation service. If you no longer have the letter, contact the local authority and ask them.",
  hasCertificateLabel: "Do you have a mediation certificate?",
  hasCertificateHint:
    "You do not have to go to a mediation meeting, but you do need to contact a mediation organisation so they can give you a certificate saying you have considered mediation.",
  hasCertificateOptions: [
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
    hasCertificateRequired: "Select yes if you have a mediation certificate"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
