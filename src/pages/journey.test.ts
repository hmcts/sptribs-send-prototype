import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { TASK_GROUPS } from "#appeal";
import appLocale from "../locales/en.js";
import { PAGES_ROOT, type PageRenderer, pageRenderer } from "./__fixtures__/render-page.js";

/**
 * A sweep over every page in the journey.
 *
 * 50-odd pages generated from one content spec share their failure modes: if a caption is
 * referenced but never defined, or an error message has no matching key, it is wrong on
 * many pages at once rather than one. So these assert the properties that have to hold
 * everywhere — the page renders at all, its title is set, its form is a POST carrying a
 * CSRF token, and every error message its content declares can actually be shown — and
 * leave the per-question behaviour to the tests beside each page.
 */

interface Page {
  slug: string;
  dir: string;
  content: { en: unknown; cy: unknown };
  /** The content resolved to an object, so the sweep can read titles and error keys. */
  strings: Record<string, unknown>;
}

/**
 * Pages with nothing to submit.
 *
 * The hub, the summary, the confirmation and the dead end are all pages you read and then
 * navigate away from — their buttons are links. Everything else asks a question, and a
 * question page that renders without a POST form is broken.
 */
const NO_FORM = new Set(["task-list", "check-answers", "confirmation", "cannot-use-this-service"]);

const APPEAL_ROOT = path.join(PAGES_ROOT, "(citizen)", "appeal");

/** Every `(slug)/slug.i18n.ts` under the journey. */
function journeyPages(): { slug: string; dir: string }[] {
  return readdirSync(APPEAL_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
    .map((entry) => ({ slug: entry.name.slice(1, -1), dir: path.join(APPEAL_ROOT, entry.name) }))
    .filter((page) => readdirSync(page.dir).includes(`${page.slug}.i18n.ts`))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

let renderer: PageRenderer;
let pages: Page[];

beforeAll(async () => {
  renderer = await pageRenderer();
  pages = await Promise.all(
    journeyPages().map(async (page) => ({
      ...page,
      ...(await resolved(page.dir, page.slug))
    }))
  );
});

/**
 * A page's content module, with a function-valued `en` called so the sweep can read it.
 *
 * The starter allows a content module to export `en` as a function of the view model, for
 * pages that interpolate — the task list's progress line, the confirmation panel's
 * reference. Those pages still have to be swept, so the function is called with an empty
 * model here.
 */
async function resolved(dir: string, slug: string): Promise<{ content: Page["content"]; strings: Record<string, unknown> }> {
  const module = (await import(pathToFileURL(path.join(dir, `${slug}.i18n.ts`)).href)) as Page["content"];
  const strings = (typeof module.en === "function" ? module.en({}) : module.en) as Record<string, unknown>;
  return { content: { en: module.en, cy: module.cy }, strings };
}

describe("every page in the journey", () => {
  it("should have been found, so a passing suite means something", () => {
    expect(pages.length).toBeGreaterThan(40);
  });

  it("should declare a title, which is what the browser tab and the h1 come from", () => {
    for (const page of pages) {
      expect(page.strings.title, `${page.slug} has no title`).toBeTruthy();
    }
  });

  it("should render without an error summary before anything has been submitted", () => {
    // The error *dictionary* and the errors to *show* are two different things under one
    // name. When they leaked into each other, every page showed "There is a problem"
    // before it had been submitted — so this is asserted for all of them, not one.
    for (const page of pages) {
      const html = renderer.render(page.slug, page.content, { values: emptyValues(page), errors: {}, backHref: "/appeal/task-list" });

      expect(html, `${page.slug} rendered no page`).toContain("</html>");
      if (!NO_FORM.has(page.slug)) {
        expect(html, `${page.slug} has no form`).toContain("</form>");
      }
      expect(html, `${page.slug} shows an error summary on first view`).not.toContain("There is a problem");
    }
  });

  it("should post to itself with a CSRF token", () => {
    for (const page of pages.filter((candidate) => !NO_FORM.has(candidate.slug))) {
      const html = renderer.render(page.slug, page.content, { values: emptyValues(page), errors: {}, backHref: "/appeal/task-list" });

      expect(html, `${page.slug} has no POST form`).toMatch(/<form method="post"/);
      expect(html, `${page.slug} posts without a CSRF token`).toContain('name="_csrf"');
      expect(html, `${page.slug} does not disable browser validation`).toContain("novalidate");
    }
  });

  it("should be able to show every error message it declares", () => {
    // An error message keyed to a field the template never renders can never appear. That
    // is invisible until somebody triggers the validation it belongs to, which is exactly
    // the path least likely to be walked by hand.
    for (const page of pages) {
      const errors = page.strings.errors as Record<string, string> | undefined;
      if (!errors) {
        continue;
      }
      for (const [key, message] of Object.entries(errors)) {
        const field = fieldFor(key);
        const html = renderer.render(page.slug, page.content, { values: emptyValues(page), errors: { [field]: key }, backHref: "/appeal/task-list" });

        expect(html, `${page.slug}: the message for ${key} is never shown`).toContain(escaped(message));
        expect(html, `${page.slug}: ${key} shows no error summary`).toContain("There is a problem");
      }
    }
  });

  it("should not shadow an app-wide locale key", () => {
    // Page content is merged over res.locals, so a page key with the same name as one of
    // src/locales/en.ts's replaces it for that page. The confirmation page did exactly that
    // with `feedback` — an object in the locale, a string on the page — and because
    // String.prototype.link is a legacy method, the phase banner's href became a function's
    // source and the link lost its text. A serious accessibility failure, from a name.
    const reserved = new Set(Object.keys(appLocale));
    // `title` is the exception: the layout expects each page to set it.
    reserved.delete("title");

    for (const page of pages) {
      for (const key of Object.keys(page.strings)) {
        expect(reserved, `${page.slug} defines "${key}", which shadows the app-wide locale`).not.toContain(key);
      }
    }
  });

  it("should give every task on the task list a page", () => {
    const slugs = new Set(pages.map((page) => page.slug));

    for (const task of TASK_GROUPS.flatMap((group) => group.tasks)) {
      expect(slugs, `the task list links to /appeal/${task.slug}, which is not a page`).toContain(task.slug);
    }
  });
});

/**
 * The message as nunjucks writes it.
 *
 * Autoescaping turns an apostrophe into `&#39;`, and plenty of these messages have one
 * ("Enter your advocate's first name"). Comparing against the raw string would fail on
 * exactly the well-written messages.
 */
const escaped = (message: string): string =>
  message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * The field an error key belongs to: `firstNameRequired` → `firstName`.
 *
 * The generated pages key error messages as `<field><Reason>`, so the field is the key
 * with its trailing capitalised word removed.
 */
function fieldFor(key: string): string {
  const match = key.match(/^(.*?)(Required|Invalid|TooLong)$/);
  return match ? match[1] : key;
}

/**
 * A view model with every value blank.
 *
 * Derived from the content's `*Label` keys rather than hard-coded, so a page added
 * tomorrow is swept without this file being touched. Arrays for the checkbox and address
 * shapes, because the templates index into them.
 */
function emptyValues(page: Page): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(page.strings)) {
    const label = key.match(/^(.*)Label$/);
    if (!label) {
      continue;
    }
    const field = label[1];
    values[field] = page.strings[`${field}Options`] ? [] : "";
    // A date input reads three parts; an address reads a record. Providing both costs
    // nothing and means the sweep does not need to know which shape a field is.
    values[`${field}-day`] = "";
    values[`${field}-month`] = "";
    values[`${field}-year`] = "";
  }
  for (const key of Object.keys(values)) {
    if (values[key] === "") {
      values[key] = key.includes("address") || key.includes("Address") ? {} : "";
    }
  }
  return values;
}
