/**
 * Content for the accessibility statement.
 *
 * Deliberately says what is true rather than what is reassuring. This is a prototype: the
 * pages are Design System components and every one is checked against WCAG 2.2 AA by axe in
 * CI, but nothing has been audited or tested with assistive technology. Claiming otherwise
 * would be the one thing an accessibility statement must never do.
 */
export const en = {
  title: "Accessibility statement",
  intro: "This is a prototype of a service for appealing a decision about an education, health and care (EHC) plan. It is not a live service.",
  complianceHeading: "How accessible this prototype is",
  compliance: [
    "It is built from GOV.UK Design System components, which are designed to meet WCAG 2.2 level AA.",
    "Every page is checked automatically against WCAG 2.2 level AA on every change, and no issues are currently reported.",
    "It has not been independently audited, and it has not been tested with screen readers, screen magnifiers, speech recognition software or by disabled users."
  ],
  claim:
    "For those reasons we make no claim that this prototype is fully accessible. An audit and testing with assistive technology would come before it was used by the public.",
  problemHeading: "Reporting an accessibility problem",
  problem: "If you find a problem, or you need information on this service in a different format, contact the SEND tribunal.",
  liveHeading: "If you need to appeal now",
  live: "To make a real appeal, use the SEND35 form on GOV.UK or the online service linked from it. Search for 'appeal an EHC plan decision' on GOV.UK."
};

// SEND is an England-only jurisdiction, so there is no Welsh content to write.
export const cy = en;
