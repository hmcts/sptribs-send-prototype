import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Cookie-policy state for the banner, and the categories the preferences page renders.
 *
 * This replaces the starter's `configureCookieManager`, which bundles the same middleware
 * together with its own `GET /cookies` page. That page renders on the starter's layout, whose
 * header passes `serviceName` to `govukHeader` — a parameter govuk-frontend 6 removed — so the
 * service name and the link back into the service silently vanish. Its routes are registered
 * before our file-system router, so they win, and our view paths are appended after the
 * starter's, so shadowing its template by filename does not work either. Owning the middleware
 * is what lets `(shared)/(cookies)/` be an ordinary page on `_layouts/citizen.njk`.
 *
 * Cookie names, shape and encoding are kept identical to the starter's so a preference already
 * stored in someone's browser still parses.
 */
const COOKIE_POLICY = "cookie_policy";
const BANNER_SEEN = "cookies_preferences_set";
const PREFERENCES_PATH = "/cookies";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export interface CookieCategories {
  /** Always on, listed for transparency. */
  essential: string[];
  [category: string]: string[];
}

export type CookiePreferences = Record<string, boolean>;

export function cookieManager(categories: CookieCategories): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const preferences = readPreferences(req);
    const decided = Object.keys(preferences).length > 0;
    const onCookiesPage = req.path === PREFERENCES_PATH;

    res.locals.cookieManager = {
      cookiesAccepted: decided,
      cookiePreferences: preferences,
      // Not on the cookies page itself: the banner would be asking a question the page in
      // front of them already answers.
      showBanner: !onCookiesPage && !decided && req.cookies?.[BANNER_SEEN] !== "true"
    };
    res.locals.cookieCategories = categories;
    next();
  };
}

export function readPreferences(req: Request): CookiePreferences {
  const raw = req.cookies?.[COOKIE_POLICY];
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(decodeURIComponent(raw)) as CookiePreferences;
  } catch {
    // A malformed cookie is treated as no decision, so the banner asks again.
    return {};
  }
}

/** Persist a decision, and record that the banner has been answered so it stops appearing. */
export function savePreferences(res: Response, preferences: CookiePreferences): void {
  res.cookie(COOKIE_POLICY, encodeURIComponent(JSON.stringify(preferences)), {
    // Readable by client JS on purpose: analytics snippets check it before loading.
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ONE_YEAR_MS
  });
  res.cookie(BANNER_SEEN, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ONE_YEAR_MS
  });
}
