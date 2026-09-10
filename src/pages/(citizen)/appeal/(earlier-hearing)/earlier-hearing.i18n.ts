/**
 * Content for earlier-hearing.
 *
 * SEND35 question 16.2. Saying yes means being contacted at short notice, which is what
 * the hint is for.
 */
export const en = {
  title: "Do you want an earlier hearing if one becomes available?",
  caption: "The hearing",
  wantEarlierHearingLabel: "Do you want an earlier hearing if one becomes available?",
  wantEarlierHearingHint: "If you say yes, the tribunal may contact you at short notice to offer an earlier date.",
  wantEarlierHearingOptions: [
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
    wantEarlierHearingRequired: "Select yes if you want an earlier hearing if one becomes available"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
