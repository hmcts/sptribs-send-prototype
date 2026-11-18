/**
 * Content for late-appeal-reason.
 *
 * SEND35 question 13.3. Shown only when the dates given put the appeal out of time. Being
 * late is never a dead end here — a judge decides — so the page explains what the judge
 * will be looking for.
 */
export const en = {
  title: "Why are you appealing after the time limit?",
  caption: "Mediation and deadlines",
  lede: "Your appeal looks like it is outside the time limit. You can still appeal, but a tribunal judge will decide whether it can go ahead.",
  lateAppealExplanationLabel: "Why are you appealing after the time limit?",
  lateAppealExplanationHint:
    "Give the full reasons for the delay, why you think the appeal should go ahead even though it is late, and why you should not have to wait for an annual review or ask for another assessment.",
  errors: {
    lateAppealExplanationRequired: "Explain why you are appealing after the time limit"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
