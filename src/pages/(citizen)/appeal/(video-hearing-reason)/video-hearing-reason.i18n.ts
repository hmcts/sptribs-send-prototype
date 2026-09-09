/**
 * Content for video-hearing-reason.
 *
 * SEND35 question 16.3.
 */
export const en = {
  title: "Why can you not take part in a hearing by video?",
  caption: "The hearing",
  cannotAttendByVideoReasonLabel: "Why can you not take part in a hearing by video?",
  errors: {
    cannotAttendByVideoReasonRequired: "Explain why you cannot take part in a hearing by video"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
