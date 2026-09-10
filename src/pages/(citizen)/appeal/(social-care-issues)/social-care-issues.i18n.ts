/**
 * Content for social-care-issues.
 *
 * SEND35 questions 11.5 and 11.6.
 */
export const en = {
  title: "Social care recommendations",
  caption: "Your reasons",
  heading: "Social care",
  socialCareIssuesLabel: "What social care issues do you want the tribunal to consider and decide about?",
  socialCareRecommendationsLabel: "What recommendations do you want the tribunal to make about social care?",
  errors: {
    socialCareIssuesRequired: "Enter the social care issues you want the tribunal to consider",
    socialCareRecommendationsRequired: "Enter the social care recommendations you want the tribunal to make"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
