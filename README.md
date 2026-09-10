# sptribs-send-prototype

A prototype citizen frontend for the **SEND35** journey — *appeal a decision about an
education, health and care (EHC) plan* — for the First-tier Tribunal (Special Educational
Needs and Disability).

It is the citizen half of an end-to-end prototype. The other half is the `StSend35` CCD case
type in [`hmcts/sptribs-case-api`](https://github.com/hmcts/sptribs-case-api): an appeal
completed here becomes a case there, which a caseworker then reads in XUI (Manage cases).

This is a prototype. It is built to the GDS Service Standard and the GOV.UK Design System
because those are what make a service usable, not because it is finished — see
[`docs/service-design.md`](docs/service-design.md) for what has been decided, what has been
deliberately left out, and why.

## What it does

| | |
|---|---|
| Journey | 52 pages covering all 17 sections of SEND35, plus the declaration and the supporting-evidence table |
| Pattern | GOV.UK start page → eligibility → task list hub → question pages → check answers → declaration → confirmation |
| Storage | The part-finished appeal is in the Redis session. Nothing is written to CCD until the declaration is signed. |
| Submission | `create-case` on the `StSend35` case type, via the CCD data-store v2 external API |
| Sign-in | IDAM OIDC, as a `citizen`. The start page and the eligibility question are open. |

## Running it locally

You need two things running: the CFT stack (CCD, IDAM, XUI) from cftlib, and this app.

```sh
# 1. The CFT stack — in a sptribs-case-api checkout on a branch with the StSend35 case type
cd ../sptribs-case-api
./gradlew bootWithCCD -PlocalAuth

# 2. This app
yarn install          # needs `az login` first: @hmcts-cft/* come from Azure Artifacts
yarn dev              # starts Redis via docker compose, then the app on :3211
```

| Service | Port | Comes from |
|---|---|---|
| This app | 3211 | `yarn dev` |
| Redis | 6379 | `docker-compose.yml` |
| IDAM simulator | 5062 | cftlib (`-PlocalAuth`) |
| S2S simulator | 8489 | cftlib (`-PlocalAuth`) |
| CCD definition store | 4451 | cftlib |
| CCD data store | 4452 | cftlib |
| XUI (Manage cases) | 3000 | cftlib |

Then open <http://localhost:3211>, and sign in as `TEST_CITIZEN_USER@mailinator.com` with
any password. To see the case a caseworker sees, open <http://localhost:3000> and sign in as
`TEST_CASE_WORKER_USER@mailinator.com`.

If the cftlib stack does not come up, `sptribs-case-api`'s own README has the two known
gotchas (XUI losing a start-up race with the IDAM simulator, and a stale Flyway state in the
shared Postgres container).

## Tests

```sh
yarn lint          # biome
yarn test          # vitest — the appeal library, and a sweep over every page in the journey
yarn test:e2e      # playwright — the journey end to end, with an axe check on every page
```

`yarn test` needs nothing running. `yarn test:e2e` needs the local stack above: it drives the
real OIDC flow and creates real CCD cases.

The e2e suite asserts zero axe-detectable WCAG 2.2 AA violations on every page it visits.
That is the cheap half of Service Standard point 5 and is not a substitute for an audit or
for testing with assistive technology.

## How the code is laid out

```
src/
  app.ts                     the whole bootstrap; order of middleware is load-bearing
  server.ts
  libs/
    appeal/                  #appeal — the domain: the draft, the task list, CCD mapping
    ccd/                     #ccd — the two data-store calls this service makes
    oidc/                    #oidc — IDAM sign-in, and the session user
    zod-validation/          #zod-validation — content-key errors and date parsing
  middleware/                redis (session), csrf, form-action (CSP)
  pages/                     one directory per page — see below
  locales/                   app-wide strings (back, continue, the footer)
```

### Adding or changing a page

One directory per page, holding the page and nothing else:

```
src/pages/(citizen)/appeal/(child-name)/
  child-name.ts        GET/POST, the zod schema, and where Back and Continue go
  child-name.njk       the template
  child-name.i18n.ts   every string on the page, including the error messages
```

`@hmcts-cft/simple-router` turns the path into the URL: `(group)` directories are stripped,
so this is `/appeal/child-name`. Any `.ts` file is a route.

The conventions, which every page follows:

- **`const BACK` and `const NEXT` at the top.** Navigation is explicit per page, not
  computed from a journey definition. Where the answer decides the next page, the redirect
  is a ternary on the validated answer and reads as the branch it is.
- **A zod schema whose messages are content keys**, not sentences: `.min(1, "firstNameRequired")`.
  `translateErrors` resolves the key against the page's `errors` map at render time, which is
  what keeps every string a citizen sees in the `.i18n.ts` file.
- **One private `render()`**, used by GET and by the POST failure path, so a page cannot
  render two different ways.
- **`export const GET = [requireRole("citizen"), getHandler]`** — middleware arrays. Only
  the start page, the eligibility question and the dead end are open.
- **`.njk` basenames are globally unique.** Nunjucks resolves templates by basename across a
  flat search path, so two pages called `check-answers.njk` would collide.

The task list and check-your-answers are components over
[`src/libs/appeal/sections.ts`](src/libs/appeal/sections.ts), not pages that know the
journey: adding a question means one entry in that manifest, and both update.

### The line the two repos have to agree on

[`src/libs/appeal/case-data.ts`](src/libs/appeal/case-data.ts) maps the draft onto CCD field
ids. A CCD field id is `<section prefix><CapitalisedProperty>` — `cypFirstName` — because
each SEND35 section is a `@JsonUnwrapped(prefix = …)` complex on `StSend35CaseData`.

Get one wrong and CCD rejects the **whole** submission, not the field. `case-data.test.ts`
pins every id this service produces against the case type's own field list; regenerate that
list with `./gradlew generateCCDConfig` in `sptribs-case-api` and read
`build/definitions/StSend35/CaseField.json`.

## Prototype-only shortcuts

These are deliberate, and they are the first things to change if this becomes a service.

- **The IDAM client is `sptribs-frontend`,** not one of its own. `idam-pr` registers each
  preview hostname as a redirect URI against it. A real service needs its own client.
- **The S2S microservice is `sptribs_case_api`,** not one of its own — it is already in the
  data store's `DATA_STORE_S2S_AUTHORISED_SERVICES`, so no platform onboarding was needed.
- **`SESSION_SECRET` is a literal in `values.preview.template.yaml`.** It belongs in the Key
  Vault, created by a `random_password` in Terraform.
- **There is no `infrastructure/`.** Preview runs an in-chart Redis; AAT would use the
  existing `sptribs` Azure Cache for Redis via `redis-access-key`.
- **No document upload.** The evidence step captures SEND35's evidence *table*; the documents
  themselves are emailed to the tribunal. Uploading means CDAM, virus scanning and a
  retention policy.
- **Master is not deployed.** The prototype lives on a PR so it deploys to Preview only —
  see below.

## Deploying to Preview

Two independent PRs land in the `sptribs` namespace and talk to each other over in-cluster
DNS:

1. A PR on `hmcts/sptribs-case-api` carrying the `StSend35` case type. Note its number —
   currently [#2642](https://github.com/hmcts/sptribs-case-api/pull/2642).
2. A PR here, with `env.CASE_API_PR` in `Jenkinsfile_CNP` set to that number.

`values.preview.template.yaml` then points `CCD_URL` at
`http://sptribs-case-api-pr-<N>-ccd-data-store-api`. Jenkins sets `global.environment=aat`
for PR builds, so IDAM and S2S are the real AAT ones while CCD is the case-api PR's.

You need the HMCTS VPN to reach a preview URL.

The case-api chart's `global.idamApiUrl` must be `idam-api`, not `idam-web-public`, or the CCD
submit fails — ccd-data-store resolves the acting user with `GET /api/v1/users/{id}`, which
only idam-api routes.

## Licence

MIT — see [LICENSE](LICENSE).
