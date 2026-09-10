/**
 * Content for young-person-age.
 *
 * Not a SEND35 question. SEND35 states the age condition for a young person appealing
 * alone as a note beside question 2.1; asking it makes the condition checkable, so
 * somebody who cannot use this service finds out now rather than at the end.
 */
export const en = {
  title: "Are you over compulsory school age and under 25?",
  caption: "About you",
  overSchoolAgeLabel: "Are you over compulsory school age and under 25?",
  overSchoolAgeHint: "Compulsory school age lasts until the end of the academic year in which you turn 16.",
  errors: {
    overSchoolAgeRequired: "Select yes if you are over compulsory school age and under 25"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
