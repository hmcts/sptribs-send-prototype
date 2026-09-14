/**
 * Content for cannot-use-this-service.
 *
 * A GOV.UK dead-end page, not a validation error. Somebody who cannot appeal on SEND35
 * usually can appeal on something else — SEND35A where there has been no assessment —
 * so the page's job is to say which route is theirs and how to reach a person.
 */
export const en = {
  title: "You cannot use this service",
  reasons: {
    age: {
      heading: "You cannot use this service",
      body: [
        "To appeal for yourself as a young person, you must be over compulsory school age and under 25. Compulsory school age lasts until the end of the academic year in which you turn 16.",
        "If you are still of compulsory school age, a parent or carer can appeal for you."
      ]
    },
    notAssessed: {
      heading: "You need a different appeal form",
      body: [
        "If the child or young person has not been assessed, or the local authority has not agreed to assess them, you need form SEND35A instead.",
        "Search for 'SEND35A' on GOV.UK to find the form."
      ]
    }
  },
  helpHeading: "If you are not sure",
  help: "Contact the SEND tribunal. They can help with the appeal form and with how the tribunal works, but they cannot give legal advice.",
  startAgain: "Start again"
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
