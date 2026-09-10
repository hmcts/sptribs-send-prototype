/**
 * Content for documents-checklist.
 *
 * The checklist on SEND35's declaration page. Not sent to CCD: it is a prompt so the
 * appeal arrives with what the tribunal needs, and the tribunal records what actually
 * turned up. Only the decision letter is required, because that is the only document
 * every appeal must have.
 */
export const en = {
  title: "Which documents are you sending?",
  caption: "Documents and evidence",
  lede: "The tribunal needs some documents with your appeal. Tick the ones you are sending.",
  documentsLabel: "Which documents are you sending?",
  documentsHint: "Select all that apply.",
  documentsOptions: [
    { value: "decisionLetter", text: "A copy of the local authority's decision letter" },
    { value: "ehcPlan", text: "A copy of the final EHC plan, if there is one", hint: "Include the documents listed in Section K of the plan." },
    { value: "mediationCertificate", text: "A copy of my mediation certificate, if my appeal needs one" }
  ],
  notLastChance: "This is not your last chance to send documents. The tribunal will tell you how long you have to send more before the hearing.",
  errors: {
    documentsDecisionLetterRequired: "You must send a copy of the local authority's decision letter"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
