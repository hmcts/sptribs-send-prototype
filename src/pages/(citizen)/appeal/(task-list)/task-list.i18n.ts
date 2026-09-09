/**
 * Content for the task list.
 *
 * The task list pattern rather than one long form: SEND35 has 17 sections, most people
 * will not have every answer to hand in one sitting, and the mediation certificate in
 * particular often has to be chased. A hub lets somebody do what they can, see what is
 * left, and come back.
 *
 * Exported as a function because the progress line interpolates the counts. The starter's
 * render interceptor calls it with the view model, which is the only way a content string
 * can reference a dynamic value — a per-key function would land in the template as a
 * function and render as nothing.
 */
export const en = (params: { done?: number; total?: number }) => ({
  title: "Appeal a decision about an EHC plan",
  heading: "Appeal a decision about an EHC plan",
  progress: `You have completed ${params.done ?? 0} of ${params.total ?? 0} sections.`,
  saveNote: "Your answers are saved as you go. You can leave this page and come back to it.",
  statusCompleted: "Completed",
  statusNotStarted: "Not started",
  submitHeading: "Send your appeal",
  submitReady: "You have answered everything the tribunal needs. Check your answers, then send your appeal.",
  submitNotReady: "You cannot send your appeal until you have completed every section.",
  checkAnswers: "Check your answers"
});

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
