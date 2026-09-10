import type { Page } from "@playwright/test";
import { type Citizen, isDeployed } from "./citizen.js";

/**
 * Sign in, against whichever IDAM the suite is pointed at.
 *
 * The two are not the same page. cftlib's simulator is a bare form with
 * `input[name=username]` and a submit button. Real IDAM serves "Sign in or create an
 * account", where the fields are `#username`/`#password` and the button is
 * `input[value="Sign in"]` — selectors taken from `sptribs-e2etests`
 * (`src/tests/helpers/idamLoginHelper.ts`), which signs into the same IDAM for the
 * sibling services, rather than guessed.
 *
 * Both are tried in turn, so one helper covers a local run and a deployed one. Which
 * page appeared is not asserted: it is another team's markup and a restyle should not
 * fail this suite.
 */
export async function submitIdamLogin(page: Page, citizen: Citizen): Promise<void> {
  const simulatorUsername = page.locator('input[name="username"]');
  const idamUsername = page.locator("#username");

  // Real IDAM first: its form is the one that changes, and it renders the heading before
  // the inputs are interactive.
  if (await idamUsername.isVisible().catch(() => false)) {
    await idamUsername.fill(citizen.email);
    await page.locator("#password").fill(citizen.password);
    await page.locator('input[value="Sign in"], button[type="submit"]').first().click();
    return;
  }

  await simulatorUsername.fill(citizen.email);
  await page.locator('input[name="password"]').fill(citizen.password);
  await page.locator('button[type="submit"]').click();
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
