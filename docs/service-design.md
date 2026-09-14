# Service design: appealing an EHC plan decision

What this prototype is trying to be, what it deliberately is not, and every place where it
departs from the paper form and why.

## The problem

A parent whose child has been refused an education, health and care plan has two months to
appeal. What they have in front of them today is **SEND35**: a 24-page PDF with 17 numbered
sections, "go to Section 10" arrows, a guidance column down the right-hand side of every
page, and a checklist of documents on the declaration page. They fill it in, sign it, and
email it to the tribunal.

The people using it are, almost by definition, not having a good year. They are usually not
lawyers. Many are doing this while also dealing with a school, a local authority, and a
child who is not getting the support they need. The form is not the hard part of their life,
but it is the part we can make easier.

## Users and what they need

| User | Need | How the service meets it |
|---|---|---|
| A parent or carer appealing for a child | To know whether they can appeal at all, and by when | Start page states the four appealable decisions, who may appeal, and the 2-month/1-month deadlines before asking for anything |
| A young person appealing for themselves | To find out early that there is an age condition | Asked immediately after "who is appealing", before any other question |
| Somebody who has not been assessed yet | To be told they need SEND35A, not to be failed by validation | A dead-end page that names the form they need |
| Anybody part-way through | To stop, find a document, and come back | Task list hub; the draft is in the session and survives a restart |
| Somebody appealing late | To be able to appeal anyway | The late-appeal question appears when the dates say so; a judge decides, not this service |
| A caseworker | To read the whole appeal | 13 tabs in XUI, every answer shown |

These are inferred from the form and the published guidance, not from research. **No user
research has been done.** That is the single largest gap in this prototype and the first
thing that should change: the questions below marked "assumption" are the ones most likely
to be wrong.

## The journey

```
/                                start page — what you can appeal, who can, when by
  ↓ Start now
/appeal/who-is-appealing          parent or carer · young person · alternative person
  ↓ young person
/appeal/young-person-age          the age condition → dead end if no
  ↓ (sign in)
/appeal/task-list                 the hub — 10 groups, 25-odd tasks, only those that apply
  ↓
  question pages                  one thing per page, 52 of them
  ↓
/appeal/check-answers             every answer, with a Change link that says what it changes
/appeal/declaration               the statement of truth, on its own page
/appeal/confirmation              the reference, and what happens next
```

Sign-in sits between the eligibility question and the task list. Deliberately: somebody has
to be able to find out whether this service is theirs before being asked to create an
account, and the eligibility answer is cheap to re-ask if they abandon.

### Why a task list rather than one long form

Three reasons, all from the form itself:

1. **It is 17 sections.** A single flow of 52 pages with no landmarks gives nobody any sense
   of where they are.
2. **The mediation certificate usually has to be chased.** Somebody will start, discover they
   need to ring a mediation service, and come back days later.
3. **The branching is severe.** A refusal to make a plan never reaches the plan-section
   questions or the school questions. A task list can hide those; a linear form has to
   either ask them or jump silently.

Tasks that do not apply are **removed**, not greyed out. Showing somebody a task they must
not answer is worse than not showing it.

## Deliberate departures from SEND35

Each of these is a choice, not an omission.

| SEND35 | Here | Why |
|---|---|---|
| "Title" on every party | Not asked | The Design System says collect only what you need. A title is not needed to process an appeal. |
| Gender as free text | Radios, with "Prefer not to say" | Free text is hard to act on and hard to answer. The Design System's pattern for gender. **Assumption**: that these four options are enough. |
| Guidance in a right-hand column | Hint text under the question, `<details>` for the longer notes | A column beside the question does not exist on a phone. The guidance is the part people most need, so it moves inline. |
| "Go to Section 10" arrows | Routing in each page's POST, and a task list that recomputes | The arrows are branch logic printed on paper. Making them real is most of the value of doing this digitally. |
| Section 6: choose from the people you named | All five options listed | Filtering to the people actually named is the obvious next iteration; listing them all lets somebody see what the choice would be. |
| An evidence table of five blank rows | "Add another" — one row at a time, with what you have added listed above | A grid of empty rows reads as a demand, and is unusable on a phone. |
| Documents attached to the form | A checklist, then email them | Upload means CDAM, virus scanning and a retention policy. Out of scope for a prototype, and the tribunal accepts email today. |
| Signature box | A text field | SEND35 already says "sign or type your name". |
| One long page per section | One thing per page | The Design System. Multi-input pages only where it sanctions them: a name, an address, a set of contact details. |

### Welsh

None. SEND is an England-only jurisdiction, so there is no Welsh-language duty here. The
locale plumbing (`cy.ts`, the `en`/`cy` content pairs) stays because it comes with the
starter and removing it would make this repo diverge from every other CFT frontend for no
gain — `cy` is exported as `en` throughout, and the language toggle is not offered.

## Fidelity is not quality

The service this prototype is part of accepts lower initial *fidelity* — less is understood
and specified up front — without accepting lower *quality*. Concretely, in this repo:

**Held to the bar:**

- Every page is checked against WCAG 2.2 AA by axe, in CI, on every run. Zero violations.
- Error messages follow the GOV.UK content pattern ("Enter their first name"), the summary
  links move focus to the field, and the page title is prefixed on error.
- Nothing is written to CCD until the declaration is signed, so an abandoned appeal leaves
  no case behind.
- CSRF on every form; the session cookie is signed with a real secret; the case reference is
  never in a URL.
- The one place the frontend and the case type have to agree — the CCD field ids — is pinned
  by a test rather than by care.

**Accepted as lower fidelity, to be found out by use:**

- No user research, so the question wording and grouping are best guesses from the form.
- The contact-preference options are not filtered to the people actually named.
- No "save and come back later" email or reference — the draft is the session, so it is lost
  if somebody clears their cookies.
- No performance measurement, no analytics beyond the cookie banner's placeholder.
- The service is not shuttered, monitored or alerted; it is a prototype.

## Service Standard

Where this prototype stands against the 14 points, honestly.

| Point | Where it stands |
|---|---|
| 1. Understand users and their needs | **Weakest.** Needs inferred from SEND35 and the GOV.UK guidance; no research. |
| 2. Solve a whole problem | Partly. The appeal is lodged end to end, but the documents still go by email and there is no way to track the appeal afterwards. |
| 3. Joined up across channels | The paper form and the email address are still there and are signposted, but nothing is shared between them. |
| 4. Simple to use | Task list, one thing per page, branching that removes what does not apply, guidance where the question is. |
| 5. Everyone can use it | Design System components throughout; axe checks every page in CI. No assistive-technology testing, no audit. |
| 6. Multidisciplinary team | Out of scope for a prototype. |
| 7. Agile ways of working | — |
| 8. Iterate and improve | The point of the prototype. |
| 9. Secure and protects privacy | CSRF, signed sessions, no case reference in a URL, no case created until submission, no upstream error bodies rendered. Not penetration tested. |
| 10. Define success, publish performance | Not done. |
| 11. Right tools and technology | The CFT Node/Express starter, govuk-frontend, CCD — the same stack as every other service on this platform. |
| 12. Make new source code open | Public repo, MIT. |
| 13. Open standards and common components | GOV.UK Design System components only; no bespoke form controls. IDAM, S2S and CCD rather than anything of its own. |
| 14. Operate a reliable service | Not attempted. Preview only. |

## What to do next

In the order it would pay off:

1. **Research the journey with parents and young people.** Everything marked "assumption"
   above.
2. **Filter section 6 to the people actually named**, and check-answers accordingly.
3. **Save and come back later properly** — a reference and a resume link, not just a session.
4. **Documents.** Upload through CDAM, so the appeal arrives complete.
5. **Track the appeal** — the confirmation page is currently the end of the citizen's
   relationship with the service.
6. **Content review** by a content designer. The wording here is the tribunal's own where it
   exists and mine where it does not, which is not the same as good.
