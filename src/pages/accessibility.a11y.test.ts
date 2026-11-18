import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { PAGES_ROOT, type PageRenderer, pageRenderer } from "./__fixtures__/render-page.js";

/**
 * An axe sweep over every page's rendered markup, with no infrastructure.
 *
 * Run by `yarn test:a11y`, which the CNP nodejs pipeline calls in the unit-test stage —
 * before anything is deployed, so there is no URL to point a browser at. Rendering the
 * templates into jsdom and running axe over the result gives the markup rules on every
 * pull request, rather than only where a preview environment exists.
 *
 * **jsdom has no layout**, so the rules that need geometry cannot run here: colour
 * contrast most importantly, and anything about focus order or visibility. Those are
 * covered by the real browser run in `test:e2e`, which is the authority. This catches the
 * other half — a missing label, a fieldset without a legend, a duplicate id, a heading
 * order that skips a level — which is the half that actually regresses when somebody edits
 * a template.
 *
 * Excluded from the default `yarn test` include so it is not run twice in CI.
 */

const APPEAL_ROOT = path.join(PAGES_ROOT, "(citizen)", "appeal");

/** Rules axe cannot evaluate without layout; asserted in the browser instead. */
const NEEDS_A_BROWSER = ["color-contrast", "color-contrast-enhanced", "target-size", "scrollable-region-focusable"];

interface Page {
  slug: string;
  dir: string;
  content: { en: unknown; cy: unknown };
  strings: Record<string, unknown>;
}

let renderer: PageRenderer;
let pages: Page[];

beforeAll(async () => {
  renderer = await pageRenderer();
  pages = await Promise.all(
    readdirSync(APPEAL_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("("))
      .map((entry) => ({ slug: entry.name.slice(1, -1), dir: path.join(APPEAL_ROOT, entry.name) }))
      .filter((page) => readdirSync(page.dir).includes(`${page.slug}.i18n.ts`))
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map(async (page) => {
        const module = (await import(pathToFileURL(path.join(page.dir, `${page.slug}.i18n.ts`)).href)) as Page["content"];
        const strings = (typeof module.en === "function" ? module.en({}) : module.en) as Record<string, unknown>;
        return { ...page, content: { en: module.en, cy: module.cy }, strings };
      })
  );
});

describe("every page in the journey", () => {
  it("should have been found, so a passing suite means something", () => {
    expect(pages.length).toBeGreaterThan(40);
  });

  it("should have no accessibility violations axe can detect in the markup", async () => {
    const failures: string[] = [];

    for (const page of pages) {
      const html = renderer.render(page.slug, page.content, { values: emptyValues(page), errors: {}, backHref: "/appeal/task-list" });
      failures.push(...(await violationsIn(html, page.slug)));
    }

    expect(failures).toEqual([]);
  });

  it("should have no accessibility violations when showing an error", async () => {
    // The error state is a different page as far as accessibility is concerned: an error
    // summary appears, inputs gain aria-describedby, and the whole thing is only ever seen
    // by somebody who has already made a mistake.
    const failures: string[] = [];

    for (const page of pages) {
      const errors = page.strings.errors as Record<string, string> | undefined;
      const first = errors && Object.keys(errors)[0];
      if (!first) {
        continue;
      }
      const html = renderer.render(page.slug, page.content, { values: emptyValues(page), errors: { [fieldFor(first)]: first }, backHref: "/appeal/task-list" });
      failures.push(...(await violationsIn(html, `${page.slug} (with an error)`)));
    }

    expect(failures).toEqual([]);
  });
});

async function violationsIn(html: string, context: string): Promise<string[]> {
  const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true });
  const results = await axe.run(dom.window.document.documentElement, {
    // Named rather than left to axe's defaults, so upgrading axe changes what is reported
    // only when this line changes.
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: Object.fromEntries(NEEDS_A_BROWSER.map((rule) => [rule, { enabled: false }]))
  });
  dom.window.close();

  return results.violations.map(
    (violation) =>
      `${context}: ${violation.id} (${violation.impact}) — ${violation.help}\n    ${violation.nodes.map((node) => node.html.slice(0, 140)).join("\n    ")}`
  );
}

/** `firstNameRequired` → `firstName`. Error keys are `<field><Reason>`. */
function fieldFor(key: string): string {
  const match = key.match(/^(.*?)(Required|Invalid|TooLong)$/);
  return match ? match[1] : key;
}

/** A view model with every value blank, derived from the content's `*Label` keys. */
function emptyValues(page: Page): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const key of Object.keys(page.strings)) {
    const label = key.match(/^(.*)Label$/);
    if (!label) {
      continue;
    }
    const field = label[1];
    values[field] = page.strings[`${field}Options`] ? [] : field.toLowerCase().includes("address") ? {} : "";
    values[`${field}-day`] = "";
    values[`${field}-month`] = "";
    values[`${field}-year`] = "";
  }
  return values;
}
