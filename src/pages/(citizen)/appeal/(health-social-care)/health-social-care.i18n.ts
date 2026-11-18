/**
 * Content for health-social-care.
 *
 * SEND35 question 11.1, optional. Two things people need to know before answering: it
 * can be asked for any reason, and the local authority will pass the appeal to the health
 * or social care provider.
 */
export const en = {
  title: "Do you want the tribunal to make recommendations about health or social care?",
  caption: "Your reasons",
  wantRecommendationLabel: "Do you want the tribunal to make recommendations about health or social care?",
  wantRecommendationHint:
    "You can ask for this for any reason. The local authority will send a copy of your appeal to the local health or social care provider.",
  wantRecommendationOptions: [
    {
      value: "Yes",
      text: "Yes"
    },
    {
      value: "No",
      text: "No"
    }
  ],
  errors: {
    wantRecommendationRequired: "Select yes if you want the tribunal to make recommendations about health or social care"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
