/**
 * Content for mediation-certificate-date.
 *
 * SEND35 question 13.2, optional. Where there is a certificate the deadline may be one
 * month from its date, so it changes the answer to whether the appeal is in time.
 */
export const en = {
  title: "What is the date on your mediation certificate?",
  caption: "Mediation and deadlines",
  mediationCertificateDateLabel: "What is the date on your mediation certificate? (optional)",
  mediationCertificateDateHint:
    "Leave this blank if you do not have a certificate. If you have one, you may need to appeal within 1 month of this date. For example, 27 3 2026",
  errors: {
    mediationCertificateDateInvalid: "The date on your mediation certificate must be a real date"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
