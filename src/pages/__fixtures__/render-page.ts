import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Response } from "express";
import nunjucks from "nunjucks";
import { translateErrors } from "#zod-validation";
import appLocale from "../../locales/en.js";

/**
 * Render a page template the way a request does.
 *
 * Template tests that build their own view model have to decide how a page's
 * locale content and its render options merge — and that merge is exactly where
 * the premature-error-summary bug lived. A test that re-implements it tests its
 * own idea of the pipeline: it can pass while the real one is broken, and it can
 * disagree with a second test that guessed differently.
 *
 * So this composes the real thing instead — `translateErrors()` patching
 * `res.render` after, and therefore wrapping, the starter's own
 * `renderInterceptorMiddleware()`, in the order `app.ts` registers them. Both the
 * per-page template tests and the whole-app first-view sweep go through here, so
 * there is one description of how a page renders rather than one per test file.
 */
export interface PageRenderer {
  /** Render `view` with a page's `en`/`cy` content module and a view model. */
  render(view: string, content: LocaleContent, model?: Record<string, unknown>): string;
  /** The configured environment, for a test that needs to render a partial directly. */
  env: nunjucks.Environment;
}

/** A page's content module: the `en`/`cy` pair its `.i18n.ts` exports. */
export interface LocaleContent {
  en?: unknown;
  cy?: unknown;
}

export async function pageRenderer(options: { locale?: string } = {}): Promise<PageRenderer> {
  const starterDir = path.dirname(fileURLToPath(import.meta.resolve("@hmcts-cft/express-govuk-starter")));
  const govukFrontend = path.join(fileURLToPath(import.meta.resolve("govuk-frontend")), "..", "..");
  const locale = options.locale ?? "en";

  // The interceptor and the filters are loaded from the starter by file path
  // rather than reimplemented: they are what this is meant to exercise, and a
  // copy here would pass while the real ones still leaked the dictionary.
  const { renderInterceptorMiddleware } = await import(pathToFileURL(path.join(starterDir, "i18n/locale-middleware.js")).href);
  const filters = await import(pathToFileURL(path.join(starterDir, "govuk-frontend/filters/index.js")).href);

  // The search path configureGovuk() builds. There is no component-lib entry: this is a
  // citizen-only service, so there is no XUI layout to render.
  const env = nunjucks.configure(
    [govukFrontend, path.join(starterDir, "govuk-frontend/views"), path.join(starterDir, "cookies/views"), ...viewPaths(PAGES_ROOT)],
    { autoescape: true }
  );

  env.addFilter("govukErrorSummary", filters.govukErrorSummaryFilter);
  env.addFilter("date", filters.dateFilter);
  env.addFilter("time", filters.timeFilter);
  env.addFilter("currency", filters.currencyFilter);
  env.addFilter("kebabCase", filters.kebabCaseFilter);

  env.addGlobal("isProduction", false);
  env.addGlobal("serviceName", "Appeal a decision about an education, health and care (EHC) plan");
  env.addGlobal("contactEmail", "send@justice.gov.uk");
  env.addGlobal("contactPhone", "0300 303 5857");
  // The dev asset entries the layouts reference.
  env.addGlobal("index_js", "/src/assets/js/main.ts");
  env.addGlobal("index_css", "/src/assets/css/index.scss");

  return {
    env,
    render(view, content, model = {}) {
      let html = "";
      const res = {
        locals: {
          // The app-wide strings translationMiddleware() puts in res.locals: back, save,
          // errorSummaryTitle and the footer. Merged from the real locale module rather
          // than stubbed, because a page that renders an empty Continue button or an
          // untitled error summary is broken and a stub would hide it.
          ...appLocale,
          locale,
          otherLocale: locale === "en" ? "cy" : "en",
          languageToggle: { link: "?lng=cy", text: "Cymraeg" }
        },
        render: (template: string, options: object) => {
          // Express appends the view engine extension; nunjucks on its own does not, so
          // a page tested as "child-name" would be reported as a missing template.
          html = env.render(template.endsWith(".njk") ? template : `${template}.njk`, options);
        }
      } as unknown as Response;

      renderInterceptorMiddleware()({}, res, () => {});
      translateErrors()({} as never, res, () => {});

      res.render(view, { en: content.en, cy: content.cy, ...model });
      return html;
    }
  };
}

export const PAGES_ROOT = path.join(import.meta.dirname, "..");

/** Every directory under `src/pages`, which is how configureGovuk builds the view search path. */
export function viewPaths(dir: string): string[] {
  return [
    dir,
    ...readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== "__fixtures__")
      .flatMap((entry) => viewPaths(path.join(dir, entry.name)))
  ];
}
