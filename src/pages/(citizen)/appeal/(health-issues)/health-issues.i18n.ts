/**
 * Content for health-issues.
 *
 * SEND35 questions 11.3 and 11.4. Two questions on one page because they are two halves
 * of one thought: the problem, and what you want done about it.
 */
export const en = {
  title: "Health recommendations",
  caption: "Your reasons",
  heading: "Health",
  healthIssuesLabel: "What health issues do you want the tribunal to consider and decide about?",
  healthRecommendationsLabel: "What recommendations do you want the tribunal to make about health?",
  errors: {
    healthIssuesRequired: "Enter the health issues you want the tribunal to consider",
    healthRecommendationsRequired: "Enter the health recommendations you want the tribunal to make"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
