import { expect, test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "../helpers/accessibility.js";
import { dismissCookieBanner, submit } from "../helpers/appeal.js";

/**
 * Smoke tests, run by `yarn test:smoke` against a deployed environment.
 *
 * Everything here is **unauthenticated** on purpose. In Preview, sign-in goes to real AAT
 * IDAM, which needs an AAT citizen account that this suite does not create — so a smoke test
 * that signed in would be testing whether somebody had remembered to make a test user. These
 * check the things that must be true for the deployment to be worth looking at: the app is
 * up, its dependencies are reachable, the start page renders, and the parts of the journey
 * that sit in front of sign-in work.
 *
 * The authenticated journey is covered end to end by `citizen-journey.spec.ts` against the
 * local cftlib stack, where a citizen user exists. See README.md.
 */

test.describe("smoke", () => {
  test("should report itself healthy, including its dependencies", async ({ request }) => {
    const response = await request.get("/health");

    expect(response.status()).toBe(200);
    const body = (await response.json()) as { status: string; services?: Record<string, string> };
    expect(body.status).toBe("UP");
    // Redis is where a part-finished appeal lives, so a healthy app without it is not useful.
    expect(body.services?.redis).toBe("UP");
  });

  test("should serve the start page", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Appeal a decision about an education, health and care (EHC) plan");
    await expect(page.getByRole("button", { name: "Start now" })).toBeVisible();
    await expectNoAccessibilityViolations(page, "the start page");
  });

  test("should ask who is appealing, and turn away somebody who cannot use the service", async ({ page }) => {
    await page.goto("/appeal/who-is-appealing");
    await dismissCookieBanner(page);

    await expect(page.getByRole("heading", { name: "Who is making the appeal?" })).toBeVisible();
    await page.getByLabel("I am appealing for myself, as a young person").check();
    await submit(page);

    await page.getByLabel("No").check();
    await submit(page);

    await expect(page.getByRole("heading", { name: "You cannot use this service" })).toBeVisible();
  });

  test("should send an anonymous visitor to sign in for anything about the appeal", async ({ page }) => {
    await page.goto("/appeal/task-list");

    // IDAM's own login form — reached through /login, which proves the OIDC client and the
    // CSP form-action allowance are both right for this hostname.
    await expect(page.locator('input[name="username"], input[name="user-name"]')).toBeVisible();
  });
});
