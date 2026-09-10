/**
 * Content for interpreter-languages.
 *
 * SEND35 question 17.1. Dialects are asked for explicitly, because the paper form does.
 */
export const en = {
  title: "Which languages do you need?",
  caption: "Support you need",
  languagesLabel: "Which languages do you need?",
  languagesHint: "Include all languages and dialects.",
  errors: {
    languagesRequired: "Enter the languages you need",
    languagesTooLong: "Languages must be 500 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
