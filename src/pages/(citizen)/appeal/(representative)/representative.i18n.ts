/**
 * Content for representative.
 *
 * SEND35 section 4. The consequence is spelled out because it is easy to miss on the
 * paper form: naming a representative means the tribunal stops writing to you.
 */
export const en = {
  title: "Do you have a representative?",
  caption: "Other people involved",
  detailsSummary: "You do not need a representative",
  detailsText:
    "You can appeal without a representative. Free advice is available from IPSEA, your local Information, Advice and Support Service, and Citizens Advice.",
  hasRepresentativeLabel: "Do you have a representative?",
  hasRepresentativeHint: "A representative deals with the tribunal for you. If you name one, the tribunal will only communicate with them.",
  hasRepresentativeOptions: [
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
    hasRepresentativeRequired: "Select yes if you have a representative"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
