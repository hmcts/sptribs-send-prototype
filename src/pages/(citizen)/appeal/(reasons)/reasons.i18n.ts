/**
 * Content for reasons.
 *
 * SEND35 question 10.1. The four prompts are the note beside that question, turned into
 * visible guidance: they are what makes the difference between a usable answer and a
 * sentence the tribunal has to write back about.
 */
export const en = {
  title: "What are your reasons for appealing?",
  caption: "Your reasons",
  appealReasonsLabel: "What are your reasons for appealing?",
  appealReasonsHint:
    "For each thing you disagree with, tell the tribunal what the issue is, why you disagree, what evidence you have, and what you want the tribunal to do.",
  errors: {
    appealReasonsRequired: "Enter your reasons for appealing"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
