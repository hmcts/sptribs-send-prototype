/**
 * Content for supporting-evidence.
 *
 * The evidence table at the end of SEND35, as an add-another loop. The examples are the
 * paper form's own, and they carry more weight than they look: "a doctor's letter" and
 * "Dr M. Smith, Paediatrician" tell somebody what level of detail is wanted far better
 * than any instruction.
 */
export const en = {
  title: "Tell the tribunal about your evidence",
  caption: "Documents and evidence",
  lede: "You can add evidence to support your appeal, such as letters, reports, photos and documents.",
  optional: "This is optional, and it is not your last chance to send documents. The tribunal will tell you how long you have to send more before the hearing.",
  addedHeading: "Evidence you have added",
  noneAdded: "You have not added any evidence yet.",
  addHeading: "Add a piece of evidence",
  evidenceDescriptionLabel: "What is the evidence?",
  evidenceDescriptionHint: "For example, a doctor's letter.",
  signedByLabel: "Who signed or wrote it? (optional)",
  signedByHint: "For example, Dr M. Smith, Paediatrician.",
  documentDateLabel: "Date on the document (optional)",
  documentDateHint: "For example, 21 1 2026",
  pageCountLabel: "How many pages? (optional)",
  addAnother: "Add this evidence",
  remove: "Remove",
  continueText: "Continue",
  errors: {
    evidenceDescriptionRequired: "Enter what the evidence is",
    evidenceDescriptionTooLong: "What the evidence is must be 500 characters or fewer",
    signedByTooLong: "Who signed or wrote it must be 255 characters or fewer",
    pageCountTooLong: "Number of pages must be 10 characters or fewer",
    documentDateInvalid: "The date on the document must be a real date"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
