import type { NextFunction, Request, Response } from "express";
import { resolveErrorKeys } from "../helpers/resolve-error-keys.js";

/**
 * The boundary between a page's error *dictionary* and the errors a render is
 * asked to *show*.
 *
 * A page's `.i18n.ts` exports an `errors` map of content key → message, and a
 * handler that fails validation passes `errors` as a `{ field: contentKey }` map.
 * Those are two different things under one name, and the starter's locale
 * interceptor spreads the selected content onto the view model — so without this
 * middleware the dictionary lands in the template context on *every* render,
 * `{% if errors %}` is always true, and every page shows an error summary before
 * it has been submitted.
 *
 * So this owns the boundary, and owns it unconditionally:
 *
 *   - the dictionary is removed from the `en`/`cy` entries handed onward, so it
 *     cannot reach the view model under any name, on any page, ever;
 *   - `errors` in the view model is set only when the handler passed errors, and
 *     then holds resolved messages rather than content keys.
 *
 * Templates therefore keep guarding on `errors`, and a page added tomorrow gets
 * the right behaviour without knowing this file exists. That is the point of
 * fixing it here rather than in each template: nothing is left for a page to
 * remember.
 *
 * Must be registered AFTER configureGovuk so it wraps — and therefore runs
 * before — the starter's locale interceptor, which is left to do the en/cy
 * selection for real. The selection repeated here is only to find the
 * dictionary; content builders are pure, so calling one twice is free.
 */
export function translateErrors() {
  return (_req: Request, res: Response, next: NextFunction) => {
    const originalRender = res.render.bind(res);

    res.render = (view: string, options?: object, callback?: (err: Error, html: string) => void) => {
      const opts = options as RenderOptions | undefined;
      // No locale content, no dictionary to keep apart from the errors — and
      // nothing for the starter's interceptor to select either.
      if (!opts || !("en" in opts) || !("cy" in opts)) {
        return originalRender(view, options, callback);
      }

      const { en, cy, errors, ...model } = opts;
      // Mirrors the starter: the interpolation context is the locals plus the
      // rest of the view model, and a locale entry may be a function of it.
      const context = { ...res.locals, ...model };
      const selected = res.locals.locale === "cy" ? (cy ?? en) : en;
      const dictionary = contentOf(selected, context).errors ?? {};

      return originalRender(
        view,
        {
          ...model,
          en: withoutDictionary(en),
          cy: withoutDictionary(cy),
          // Always set, so this is the *only* thing that decides what `errors`
          // means to a template. Resolved messages when the handler asked for
          // them, `undefined` otherwise — which is falsy in Nunjucks, so
          // `{% if errors %}` is false on a GET, and an `errors` that somehow
          // reached res.locals cannot show through either.
          errors: errors && resolveErrorKeys(errors, dictionary)
        },
        callback
      );
    };

    next();
  };
}

/** A locale entry's content, whether it is a plain object or a function of the view model. */
function contentOf(entry: LocaleEntry | undefined, context: Record<string, unknown>): LocaleContent {
  return (typeof entry === "function" ? entry(context) : entry) ?? {};
}

/**
 * The same locale entry with its error dictionary removed, keeping its form: a
 * function stays a function, so the starter still interpolates it against the
 * view model.
 */
function withoutDictionary(entry: LocaleEntry | undefined): LocaleEntry | undefined {
  if (typeof entry === "function") {
    return (context: Record<string, unknown>) => omitErrors(entry(context));
  }
  return entry && omitErrors(entry);
}

const omitErrors = ({ errors: _dictionary, ...content }: LocaleContent): LocaleContent => content;

type LocaleContent = { errors?: Record<string, string>; [key: string]: unknown };
type LocaleEntry = LocaleContent | ((context: Record<string, unknown>) => LocaleContent);

interface RenderOptions {
  en?: LocaleEntry;
  cy?: LocaleEntry;
  errors?: Record<string, string>;
  [key: string]: unknown;
}
