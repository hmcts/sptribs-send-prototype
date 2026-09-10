import type { Page } from "@playwright/test";
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
  // The simulator, when the whole form is on one page.
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
 * The interstitial is skipped when the browser is already past it — landing straight on
 * /enter-email happens when IDAM remembers the choice — so each step is entered only if its
 * own field is on the page.
 */
async function signInThroughIdam(page: Page, citizen: Citizen): Promise<void> {
  // Located by href rather than by name: "Sign in" also appears in the page's own chrome,
  // which makes a by-name lookup ambiguous under strict mode.
  const signIn = page.locator('a[href="/enter-email"]');
  if (
    await signIn
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await signIn.first().click();
    await page.waitForLoadState("domcontentloaded");
  }

  const email = page.locator("#email:not([type=hidden])");
  if (
    await email
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await email.first().fill(citizen.email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForLoadState("domcontentloaded");
  }

  await page.locator("#password").fill(citizen.password);
  await page.getByRole("button", { name: "Continue" }).click();
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
