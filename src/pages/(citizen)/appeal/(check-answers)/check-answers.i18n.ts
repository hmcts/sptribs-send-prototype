/**
 * Content for check-answers.
 *
 * The Design System's check-answers pattern. The declaration is on the next page rather
 * than at the bottom of this one: SEND35 makes it a signed statement of truth, and a
 * statement of truth deserves its own page rather than a checkbox under a long list.
 */
export const en = {
  title: "Check your answers before sending your appeal",
  heading: "Check your answers before sending your appeal",
  lede: "Check that everything below is right. You can change any answer before you send your appeal.",
  change: "Change",
  notReadyHeading: "You have not finished your appeal",
  notReady: "Some sections are not complete. Go back to the task list and finish them before you send your appeal.",
  backToTaskList: "Back to the task list",
  continueText: "Continue to the declaration"
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
