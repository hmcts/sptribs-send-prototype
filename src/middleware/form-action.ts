import type { NextFunction, Request, Response } from "express";

/**
 * Let a form submission end at IDAM.
 *
 * Helmet's default Content-Security-Policy includes `form-action 'self'`, and Chromium
 * applies `form-action` to every hop of a redirect chain, not just the form's own target.
 * So a POST that lands on a page requiring sign-in is blocked outright:
 *
 *     Refused to send form data to 'http://localhost:3211/appeal/who-is-appealing'
 *     because it violates the following Content Security Policy directive:
 *     "form-action 'self'"
 *
 * The 302s to `/login` and on to IDAM are all issued, and the browser then throws the
 * navigation away — so the citizen sees the page they just submitted, unchanged, with no
 * error on it. Nothing in the server log says anything is wrong.
 *
 * It is not only the sign-in-part-way-through case: any session that expires mid-journey
 * ends the same way, which is exactly when somebody is least able to work out what
 * happened.
 *
 * So the IDAM origin is added to `form-action`. Done by extending the header the starter's
 * `configureHelmet()` already set rather than by rebuilding the policy here: every other
 * directive stays the starter's business, and a policy copied into this repo would quietly
 * stop tracking theirs.
 */
export function allowIdamFormAction(idamIssuer: string) {
  const origin = originOf(idamIssuer);

  return (_req: Request, res: Response, next: NextFunction) => {
    const existing = res.getHeader("Content-Security-Policy");
    if (typeof existing === "string" && origin) {
      res.setHeader("Content-Security-Policy", withFormAction(existing, origin));
    }
    next();
  };
}

/**
 * Add `origin` to the `form-action` directive, or add the directive if the policy has none.
 *
 * A CSP header is a `;`-separated list of directives, and a directive absent from the
 * header is unrestricted — so a policy without `form-action` needs one adding rather than
 * leaving alone, otherwise tightening the starter's defaults later would silently
 * reintroduce the block.
 */
export function withFormAction(policy: string, origin: string): string {
  const directives = policy
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean);

  const at = directives.findIndex((directive) => directive.toLowerCase().startsWith("form-action"));
  if (at === -1) {
    return [...directives, `form-action 'self' ${origin}`].join("; ");
  }
  if (directives[at].includes(origin)) {
    return policy;
  }

  directives[at] = `${directives[at]} ${origin}`;
  return directives.join("; ");
}

/** The scheme and host of the issuer, which is what a CSP source expression wants. */
function originOf(issuer: string): string | undefined {
  try {
    return new URL(issuer).origin;
  } catch {
    return undefined;
  }
}
