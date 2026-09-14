# sptribs-send-prototype

Prototype citizen frontend for the SEND35 journey — appeal a decision about an education,
health and care (EHC) plan. Express 5 + Nunjucks + govuk-frontend, on the `@hmcts-cft/*`
starter stack. Read [`README.md`](README.md) first for how to run it and
[`docs/service-design.md`](docs/service-design.md) for why it is shaped the way it is.

## The two things most likely to catch you out

**CCD field ids.** `src/libs/appeal/case-data.ts` maps the draft onto them, and the id is
`<section prefix><CapitalisedProperty>` — `cypFirstName` — because each SEND35 section is a
`@JsonUnwrapped(prefix = …)` complex on `StSend35CaseData` in `sptribs-case-api`. One wrong
id and CCD rejects the **entire** submission, not the field. `case-data.test.ts` pins the
whole set; if you change a question name, reconcile that list against
`build/definitions/StSend35/CaseField.json` in `sptribs-case-api`.

**Page content keys are merged over `res.locals`.** A key with the same name as one in
`src/locales/en.ts` replaces it for that page. This is not theoretical: `feedback` on the
confirmation page shadowed the locale's `feedback` object, and because
`String.prototype.link` is a legacy method the phase banner's `href` became a function's
source and its link lost its text. `journey.test.ts` now guards against it.

## Page conventions

One directory per page — `(child-name)/child-name.{ts,njk,i18n.ts}`. `@hmcts-cft/simple-router`
strips `(group)` directories from the URL, and any `.ts` file is a route.

- `const BACK` / `const NEXT` at the top. Branching is a ternary on the validated answer in
  the redirect, not a journey definition.
- A zod schema whose messages are **content keys** (`.min(1, "firstNameRequired")`), resolved
  by `translateErrors` against the page's `errors` map. Every string a citizen sees lives in
  the `.i18n.ts`.
- One private `render()`, shared by GET and the POST failure path.
- `export const GET = [requireRole("citizen"), getHandler]`. Only `/`,
  `/appeal/who-is-appealing`, `/appeal/young-person-age` and
  `/appeal/cannot-use-this-service` are open.
- `.njk` basenames must be globally unique — nunjucks resolves by basename across a flat
  search path.
- A content module may export `en` as a **function** of the view model where a string
  interpolates (the task list's progress line, the confirmation panel). A per-key function
  does not work: it lands in the template as a function.
- Optional dates pass `required: ""` to `parseDayMonthYear`, which is what makes all three
  parts blank acceptable.

The task list and check-your-answers are components over `src/libs/appeal/sections.ts` and
`summary.ts`. Adding a question is one entry in the manifest, not an edit to either page.

## Testing

- `yarn test` — vitest. Colocated `*.test.ts`, plus `src/pages/journey.test.ts`, which sweeps
  every page in the journey: it renders, has a title, posts with a CSRF token, can show every
  error message it declares, and shadows no locale key.
- `yarn test:e2e` — playwright against the local cftlib stack. Every page it visits is
  checked with axe for WCAG 2.2 AA. Keep it that way: it is the cheap half of Service
  Standard point 5, and the only automated check on it.
- `yarn lint` — biome. `yarn lint:fix` for formatting.

## Do not

- Add a document upload without CDAM, virus scanning and a retention policy.
- Write to CCD before the declaration — an abandoned appeal must leave no case behind.
- Put the case reference in a URL.
- Reintroduce a config-driven journey engine. The pages are hand-written on purpose; the
  sibling `tfs-frontend` spike is the engine-driven approach and this is deliberately not it.
