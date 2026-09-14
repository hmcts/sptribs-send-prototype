/**
 * Content for reasonable-adjustments.
 *
 * SEND35 section 17. The list of examples is the paper form's, and the prompt to think
 * about all communication rather than only the hearing is the point of the second
 * paragraph.
 */
export const en = {
  title: "Do you need any reasonable adjustments or support?",
  caption: "Support you need",
  heading: "Do you need any reasonable adjustments or support?",
  body: [
    "Some people need support to access information and use our services. You can ask for reasonable adjustments if you have a health condition or a disability. Some adjustments need to be agreed by the tribunal.",
    "Think about everything you might need — not only at a hearing, but in all the tribunal's letters and calls. You can tell the tribunal if your needs change."
  ],
  detailsSummary: "Examples of reasonable adjustments",
  detailsText:
    "A sign language interpreter. Documents in alternative formats, colours or fonts. Help with communication, sight, hearing or speaking. Help with managing your mental health. Access and mobility support if a hearing takes place in person.",
  needsAdjustmentsLabel: "Do you, or anyone supporting you, need any reasonable adjustments or support?",
  needsAdjustmentsOptions: [
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
    needsAdjustmentsRequired: "Select yes if you need any reasonable adjustments or support"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
