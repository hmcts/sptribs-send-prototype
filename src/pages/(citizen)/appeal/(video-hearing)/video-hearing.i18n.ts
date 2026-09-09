/**
 * Content for video-hearing.
 *
 * SEND35 question 16.3. Most hearings are by video, so a no matters and needs a reason.
 */
export const en = {
  title: "Can you take part in a hearing by video?",
  caption: "The hearing",
  canAttendByVideoLabel: "Can you take part in a hearing by video?",
  canAttendByVideoHint: "Most hearings are held remotely by video. You will be given guidance on how to join closer to the date.",
  canAttendByVideoOptions: [
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
    canAttendByVideoRequired: "Select yes if you can take part in a hearing by video"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
