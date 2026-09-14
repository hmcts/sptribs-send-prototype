/**
 * Content for hearing-type.
 *
 * SEND35 section 16. It is a preference, not a choice — a paper hearing needs the local
 * authority to agree, and the tribunal decides. Saying so up front avoids a citizen
 * thinking they have decided something they have not.
 */
export const en = {
  title: "What type of hearing would you prefer?",
  caption: "The hearing",
  heading: "What type of hearing would you prefer?",
  body: [
    "You will only have a paper hearing if you and the local authority both agree to one. The tribunal will consider your preference and decide the format.",
    "Most hearings you attend are held remotely by video. A small number are held in person at a tribunal building."
  ],
  preferredTypeLabel: "What type of hearing would you prefer?",
  preferredTypeOptions: [
    {
      value: "attended",
      text: "A hearing I can attend by video or in person"
    },
    {
      value: "paper",
      text: "A paper hearing",
      hint: "The tribunal decides on the documents and evidence provided. This can be quicker, and you do not attend."
    }
  ],
  errors: {
    preferredTypeRequired: "Select the type of hearing you would prefer"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
