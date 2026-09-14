/**
 * Content for plan-sections.
 *
 * SEND35 question 8.3. Only Sections B, F and I can be appealed; health and social care
 * are recommendations, which is said here so nobody looks for them in this list.
 */
export const en = {
  title: "Which parts of the EHC plan do you disagree with?",
  caption: "What you are appealing",
  planSectionsLabel: "Which parts of the EHC plan do you disagree with?",
  planSectionsHint:
    "Select all that apply. Health (Sections C and G) and social care (Sections D and H) are recommendations rather than appeals — you can ask for those later in this appeal.",
  planSectionsOptions: [
    {
      value: "sectionB",
      text: "Section B — the child or young person's special educational needs"
    },
    {
      value: "sectionF",
      text: "Section F — the educational help or provision they need"
    },
    {
      value: "sectionI",
      text: "Section I — the school, college or education provider named in the plan"
    }
  ],
  errors: {
    planSectionsRequired: "Select which parts of the EHC plan you disagree with"
  }
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write. The
// locale plumbing stays because it comes with the starter — see docs/service-design.md.
export const cy = en;
