import type { Locator, Page } from "@playwright/test";
import { type Citizen, isDeployed } from "./citizen.js";

/**
 * Sign in, against whichever IDAM the suite is pointed at.
 *
 * The two are not the same journey, and this is the part most likely to break when IDAM
 * changes — so it is written from what the pages actually serve, probed against AAT, rather
 * than from another repo's selectors.
 *
 * **cftlib's simulator** is a single bare form: `input[name=username]`, `input[name=password]`,
 * submit.
 *
 * **Real IDAM** is three pages, which is why the older single-form selectors miss it
 * entirely:
 *
 *   /sign-in-or-create   "Sign in" (a link to /enter-email) or "Create account"
 *   /enter-email         #email    → Continue
 *   /enter-password      #password → Continue
 *
 * That first page is the "Sign in or create an account" interstitial — it has no username
 * field at all, so a helper that goes straight for one times out on a page that is working
 * perfectly.
 */
export async function submitIdamLogin(page: Page, citizen: Citizen): Promise<void> {
  // The simulator, when the whole form is on one page. `isVisible()` is safe here only because
  // a missing field means "this is real IDAM", which the fallback then handles — see the note
  // on waiting in signInThroughIdam.
  const simulatorUsername = page.locator('input[name="username"]');
  if (await simulatorUsername.isVisible().catch(() => false)) {
    await simulatorUsername.fill(citizen.email);
    await page.locator('input[name="password"]').fill(citizen.password);
    await page.locator('button[type="submit"]').click();
    return;
  }

  await signInThroughIdam(page, citizen);
}

/**
 * Real IDAM's three-page sign-in.
 *
 * Which page you are on is decided by *waiting* for one of the possibilities, never by asking
 * `isVisible()` and moving on. That distinction is the whole reliability of this helper.
 * `isVisible()` answers immediately about the DOM as it stands: race it against a page still
 * loading and it says false for an element that is about to exist, the step is skipped, and the
 * failure lands further down as a 30-second timeout filling a field on a page that never got
 * its click. That produced a suite where four tests failed, passed on rerun, and moved between
 * runs — with screenshots showing a page that looked perfectly fine.
 *
 * The interstitial is also genuinely skippable: IDAM remembers the choice and sends a returning
 * browser straight to /enter-email. So the states are raced against each other rather than
 * assumed in sequence.
 */
async function signInThroughIdam(page: Page, citizen: Citizen): Promise<void> {
  // Located by href rather than by name: "Sign in" also appears in the page's own chrome,
  // which makes a by-name lookup ambiguous under strict mode.
  const signIn = page.locator('a[href="/enter-email"]');
  const email = page.locator("#email:not([type=hidden])");
  const password = page.locator("#password");

  // Either the interstitial or, for a returning browser, the email page.
  await Promise.race([expectVisible(signIn), expectVisible(email), expectVisible(password)]);

  if (
    await signIn
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await dismissIdamCookieBanner(page);
    await signIn.first().click();
    await expectVisible(email);
  }

  if (
    await email
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await dismissIdamCookieBanner(page);
    await email.first().fill(citizen.email);
    await page.getByRole("button", { name: "Continue" }).click();
    await expectVisible(password);
  }

  await dismissIdamCookieBanner(page);
  await password.fill(citizen.password);
  await page.getByRole("button", { name: "Continue" }).click();
}

/** Wait for a locator to be visible, resolving false rather than throwing when it never is. */
async function expectVisible(locator: Locator): Promise<boolean> {
  return locator
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
}

/**
 * Dismiss IDAM's cookie banner, which is not the service's own.
 *
 * IDAM is a separate application on a separate domain (`hmcts-access.service.gov.uk` branding,
 * served from `idam-web-public…`), so dismissing the service's banner does nothing for this
 * one. Its wording differs too — "Reject additonal cookies", including IDAM's own typo — so it
 * is matched loosely rather than by exact text, which would break when that is fixed.
 */
async function dismissIdamCookieBanner(page: Page): Promise<void> {
  // Located by id, not by text: the visible label is "Reject additonal cookies" — IDAM's own
  // typo — so matching on wording breaks whenever they fix it.
  const reject = page.locator("#reject-additional-cookies");
  if (!(await reject.isVisible().catch(() => false))) {
    return;
  }
  await reject.click();

  // Rejecting reveals #cookie-confirmation, which is another banner in the same place. It keeps
  // covering the buttons underneath until its own hide button is used.
  const hide = page.locator("#hide-cookie-banner, #cookie-confirmation button").first();
  await hide.waitFor({ state: "visible", timeout: 2000 }).catch(() => undefined);
  if (await hide.isVisible().catch(() => false)) {
    await hide.click();
  }
  await page
    .locator("#cookie-banner, #cookie-confirmation")
    .first()
    .waitFor({ state: "hidden", timeout: 2000 })
    .catch(() => undefined);
}

/**
 * Drive the whole flow from the start: hit `/login`, sign in, and land back on the
 * post-callback page. After this returns the user is signed in.
 */
export async function signIn(page: Page, citizen: Citizen, returnTo?: string): Promise<void> {
  const url = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
  await page.goto(url);
  await submitIdamLogin(page, citizen);
}

/** Whether this run is against a deployed environment. Re-exported so specs need one import. */
export { isDeployed };
