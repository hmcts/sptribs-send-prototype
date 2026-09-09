/**
 * Content for your-relationship.
 *
 * SEND35 question 2.2. Skipped for a young person appealing for themselves — the task
 * list does not show it, and the journey routes past it.
 */
export const en = {
  title: "What is your relationship to the child or young person?",
  caption: "About you",
  relationshipLabel: "What is your relationship to the child or young person?",
  relationshipHint: "For example, mother, father, grandparent, foster carer.",
  errors: {
    relationshipRequired: "Enter your relationship to the child or young person",
    relationshipTooLong: "Relationship must be 100 characters or fewer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
