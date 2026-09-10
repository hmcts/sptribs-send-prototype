import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { PAGES_ROOT, type PageRenderer, pageRenderer } from "./__fixtures__/render-page.js";

/**
 * Every page shows the service name, and it links back into the service.
 *
 * Two things make this worth asserting rather than assuming.
 *
 * First, govuk-frontend 6 removed `serviceName` from `govukHeader` — it belongs to
 * `govukServiceNavigation` now. A template still passing it to the header does not fail, or
 * warn: the parameter is quietly ignored and the page renders a bare GOV.UK crest. Nothing
 * looks broken unless you know the service name should be there.
 *
 * Second, that header is also the only way back into the service from an interstitial page.
 * The cookies page shipped without it, and the way you noticed was being stuck there.
 *
 * The journey sweep in `journey.test.ts` covers `(citizen)/appeal` only, which is why this is
 * separate: the pages that had the bug are the shared ones outside it.
 */

/** Every `(slug)/slug.njk` under `src/pages`, journey and shared alike. */
function allPages(dir: string): { slug: string; dir: string }[] {
  const entries = readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory() && entry.name !== "__fixtures__");
  return entries.flatMap((entry) => {
    const child = path.join(dir, entry.name);
    const slug = entry.name.startsWith("(") ? entry.name.slice(1, -1) : entry.name;
    const own = readdirSync(child).includes(`${slug}.njk`) ? [{ slug, dir: child }] : [];
    return [...own, ...allPages(child)];
  });
}

interface Page {
  slug: string;
  html: string;
}

let renderer: PageRenderer;
let pages: Page[];

beforeAll(async () => {
  renderer = await pageRenderer();

  pages = await Promise.all(
    allPages(PAGES_ROOT).map(async ({ slug, dir }) => {
      const content = await contentOf(dir, slug);
      return { slug, html: renderer.render(slug, content, viewModel(content.en)) };
    })
  );
});

/**
 * Enough of a view model for any page to render.
 *
 * The fields are derived from the page's own content keys the way `journey.test.ts` does it —
 * a `fooLabel` implies a `foo` field — because the alternative is a hardcoded list that goes
 * stale as questions are added. The extra keys cover the shared pages and the components
 * (task list, check answers, cookie preferences) that read collections rather than fields.
 */
function viewModel(en: unknown): Record<string, unknown> {
  const strings = (en ?? {}) as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  for (const key of Object.keys(strings)) {
    const label = key.match(/^(.*)Label$/);
    if (!label) {
      continue;
    }
    const field = label[1];
    // Options mean a checkbox group (an array); an address reads a record; everything else
    // is a string. Date inputs read three parts, so those are always provided.
    values[field] = strings[`${field}Options`] ? [] : /address/i.test(field) ? {} : "";
    values[`${field}-day`] = "";
    values[`${field}-month`] = "";
    values[`${field}-year`] = "";
  }

  return {
    values,
    errors: {},
    backHref: "/appeal/task-list",
    // The cookie preferences page.
    categories: { essential: [], analytics: [], preferences: [] },
    preferences: {},
    // The task list, check answers and the evidence table.
    sections: [],
    groups: [],
    rows: [],
    tasks: [],
    evidence: []
  };
}

async function contentOf(dir: string, slug: string): Promise<{ en?: unknown; cy?: unknown }> {
  if (!readdirSync(dir).includes(`${slug}.i18n.ts`)) {
    return {};
  }
  const module = (await import(pathToFileURL(path.join(dir, `${slug}.i18n.ts`)).href)) as {
    en?: unknown;
    cy?: unknown;
  };
  // Content modules may export `en` as a function of the view model.
  const en = typeof module.en === "function" ? (module.en as (model: unknown) => unknown)({}) : module.en;
  return { en, cy: module.cy };
}

describe("the service header", () => {
  it("should find some pages, so a passing test means something", () => {
    expect(pages.length).toBeGreaterThan(40);
  });

  it("should show the service name on every page", () => {
    const missing = pages.filter((page) => !page.html.includes("govuk-service-navigation__service-name")).map((page) => page.slug);

    expect(
      missing,
      "these pages render no service-navigation service name — most likely they extend the starter's layouts/default.njk, whose header passes serviceName to govukHeader (removed in govuk-frontend 6) instead of to govukServiceNavigation. Extend _layouts/citizen.njk."
    ).toEqual([]);
  });

  it("should link the service name back to the start of the service", () => {
    // Asserted on the anchor inside the service-name span rather than on the whole page,
    // so a stray link to "/" elsewhere cannot satisfy it.
    const notLinked = pages
      .filter((page) => {
        const serviceName = page.html.match(/govuk-service-navigation__service-name">([\s\S]*?)<\/span>/)?.[1] ?? "";
        return !/<a\s+href="\/"\s+class="govuk-service-navigation__link"/.test(serviceName);
      })
      .map((page) => page.slug);

    expect(notLinked, "the service name must be a link to / so there is a way back into the service from every page").toEqual([]);
  });
});
