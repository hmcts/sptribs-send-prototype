/**
 * Content for no-mediation-explanation.
 *
 * SEND35 note to question 12.2. The warning about delay is the paper form's own, and it
 * is the reason this answer needs to be full rather than brief.
 */
export const en = {
  title: "Why do you not have a mediation certificate?",
  caption: "Mediation and deadlines",
  lede: "The tribunal will decide whether it can accept your reason. Explain it in full — an incomplete explanation may delay your appeal.",
  noCertificateExplanationLabel: "Why do you not have a mediation certificate?",
  errors: {
    noCertificateExplanationRequired: "Explain why you do not have a mediation certificate"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
