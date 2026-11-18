/**
 * Content for the declaration.
 *
 * SEND35's declaration and signature block. Its own page, because it is a statement of
 * truth: putting it under a long check-answers list makes it something people scroll
 * past. The wording of the two declarations is the paper form's.
 */
export const en = {
  title: "Declaration",
  heading: "Declaration",
  lede: "Only the person completing this appeal on behalf of the child or young person, or a young person appealing for themselves, can confirm this declaration.",
  capacityLabel: "Confirm the declaration",
  capacityOptions: [
    { value: "onBehalf", text: "I confirm, as the person completing this appeal on behalf of the child or young person, that the facts stated in it are true" },
    { value: "youngPersonAlone", text: "I confirm, as the young person appealing alone, that the facts stated in this appeal are true" }
  ],
  signatoryRoleLabel: "Who is signing this appeal?",
  signatoryRoleOptions: [
    { value: "parentOrCarer", text: "Parent or carer" },
    { value: "youngPerson", text: "Young person" },
    { value: "representative", text: "Representative" }
  ],
  fullNameLabel: "Full name",
  signatureLabel: "Signature",
  signatureHint: "Type your name.",
  dateSignedLabel: "Date",
  dateSignedHint: "For example, 27 3 2026",
  warning: "Once you send your appeal you cannot change your answers in this service. If something needs to change, contact the tribunal.",
  continueText: "Accept and send your appeal",
  errors: {
    capacityRequired: "Select the declaration that applies to you",
    signatoryRoleRequired: "Select who is signing this appeal",
    fullNameRequired: "Enter your full name",
    fullNameTooLong: "Full name must be 100 characters or fewer",
    signatureRequired: "Type your name to sign this appeal",
    signatureTooLong: "Signature must be 100 characters or fewer",
    dateSignedRequired: "Enter the date you are signing this appeal",
    dateSignedInvalid: "The date must be a real date"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
