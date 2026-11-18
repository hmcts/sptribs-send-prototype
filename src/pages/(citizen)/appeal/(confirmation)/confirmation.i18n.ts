/**
 * Content for the confirmation page.
 *
 * The "what happens next" content is SEND35's own last page: a text message if a mobile
 * number was given, a confirmation letter once registered, 10 working days to hear back,
 * and contact the tribunal after 25. Those numbers are what stop people ringing on day
 * three, so they are on the page rather than in an email nobody keeps.
 *
 * Exported as a function so the panel can carry the reference — see task-list.i18n.ts for
 * why a per-key function does not work.
 */
export const en = (params: { reference?: string }) => ({
  title: "Appeal sent",
  panelTitle: "Appeal sent",
  panelHtml: `Your appeal reference<br><strong>${params.reference ?? ""}</strong>`,
  keepReference: "Keep a note of your appeal reference. You will need it if you contact the tribunal.",
  whatNextHeading: "What happens next",
  whatNext: [
    "If you gave a mobile phone number, the tribunal will send you a text message to confirm it is reviewing your appeal.",
    "The tribunal aims to tell you within 10 working days whether it has registered your appeal or needs more information. In busy periods it takes longer. Contact the tribunal if you have not heard within 25 working days.",
    "Once your appeal is registered you will get a confirmation letter, and the tribunal will notify the local authority."
  ],
  documentsHeading: "Sending your documents",
  documents: [
    "Email the documents you ticked, and any supporting evidence, to the SEND tribunal. Put your appeal reference in the subject line.",
    "This is not your last chance to send documents. The tribunal will tell you how long you have to send more before the hearing."
  ],
  feedbackHeading: "What did you think of this service?",
  // Not `feedback`: that name is already an object in src/locales/en.ts, used by the phase
  // banner. A page key of the same name shadows it, and because String.prototype.link is a
  // legacy method the banner's href silently became a function's source and its link lost
  // its text — a serious accessibility failure from a name clash.
  feedbackPrompt: "Your feedback helps us improve it."
});

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
