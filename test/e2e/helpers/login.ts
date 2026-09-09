import type { Page } from "@playwright/test";

/**
 * Fill in the IDAM simulator's login form, wherever the browser arrived at it.
 *
 * Two ways in: a spec that goes to `/login` itself, and a spec that answers a question and
 * gets sent here by `requireRole` on the next page. Both end up on the same form, so both
 * use this.
 */
export async function submitIdamLogin(page: Page, email: string): Promise<void> {
  await page.fill('input[name="username"]', email);
  await page.fill('input[name="password"]', "password");
  await page.click('button[type="submit"]');
}

/**
 * Drive the real OIDC flow against the IDAM simulator from the start: hit `/login`, fill
 * the form, and land back on the post-callback page. After this returns the user is signed
 * in.
 */
export async function signIn(page: Page, email: string, returnTo?: string): Promise<void> {
  const url = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
  await page.goto(url);
  await submitIdamLogin(page, email);
}
