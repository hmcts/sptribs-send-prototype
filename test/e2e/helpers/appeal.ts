import { expect, type Page } from "@playwright/test";
import { submitIdamLogin } from "./login.js";

/**
 * Walking the appeal, as a citizen would.
 *
 * Each helper answers one page and asserts where it lands, so a spec reads as the journey
 * rather than as a list of selectors. Where the answer changes the route, the helper takes
 * it as an argument and the spec's own name says which branch it is walking.
 */

export const CITIZEN = "TEST_CITIZEN_USER@mailinator.com";

export async function startAsParent(page: Page): Promise<void> {
  await page.goto("/");
  await dismissCookieBanner(page);
  await page.getByRole("button", { name: "Start now" }).click();

  await expect(page.getByRole("heading", { name: "Who is making the appeal?" })).toBeVisible();
  await page.getByLabel("I am appealing for a child, as their parent or carer").check();
  await submit(page);
}

/**
 * Get the cookie banner out of the way.
 *
 * Not incidental tidying: until it is dismissed its two buttons are on every page, so any
 * selector that looks for "a button" finds three.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const reject = page.getByRole("button", { name: "Reject analytics cookies" });
  if (!(await reject.isVisible().catch(() => false))) {
    return;
  }
  await reject.click();

  // Rejecting swaps the banner for a confirmation with its own button. Waited for with a
  // short explicit timeout rather than a bare click: a click on a locator that never
  // appears blocks for the whole 30-second test timeout, which reads as the journey
  // hanging rather than as a banner that had already gone.
  const hide = page.getByRole("button", { name: "Hide this message" });
  await hide.waitFor({ state: "visible", timeout: 2000 }).catch(() => undefined);
  if (await hide.isVisible().catch(() => false)) {
    await hide.click();
  }
}

/** Sign in, from wherever the first protected page sent an anonymous visitor. */
export async function signInAsCitizen(page: Page): Promise<void> {
  await submitIdamLogin(page, CITIZEN);
}

export async function fillText(page: Page, label: string, value: string): Promise<void> {
  await page.getByLabel(label, { exact: true }).fill(value);
}

export async function fillDate(page: Page, legend: string, date: { day: string; month: string; year: string }): Promise<void> {
  const group = page.getByRole("group", { name: legend });
  await group.getByLabel("Day").fill(date.day);
  await group.getByLabel("Month").fill(date.month);
  await group.getByLabel("Year").fill(date.year);
}

/** Submit the page and wait for the redirect that follows a valid answer. */
export async function submit(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /^Next$|Continue|Accept and send|Add this evidence/ })
    .first()
    .click();
}

export async function goToTask(page: Page, name: string): Promise<void> {
  await page.goto("/appeal/task-list");
  await page.getByRole("link", { name }).click();
}

export async function expectTaskComplete(page: Page, name: string): Promise<void> {
  await page.goto("/appeal/task-list");
  const item = page.locator(".govuk-task-list__item", { has: page.getByRole("link", { name }) });
  await expect(item.locator(".govuk-task-list__status")).toHaveText("Completed");
}

/** Sign in and drive the whole journey to the point where it can be submitted. */
export async function completeAppeal(page: Page): Promise<void> {
  await startAsParent(page);
  await signInAsCitizen(page);
  await expect(page).toHaveURL(/\/appeal\/child-name/);

  // The child or young person
  await fillText(page, "First name", "Amara");
  await fillText(page, "Last name", "Okonjo");
  await submit(page);
  await fillDate(page, "What is their date of birth?", { day: "7", month: "3", year: "2012" });
  await submit(page);
  await page.getByLabel("Female").check();
  await submit(page);

  // What you are appealing. A refusal to make a plan is the shortest branch: it skips the
  // plan-section and school questions entirely.
  await goToTask(page, "What you are appealing about");
  await page.getByLabel("The local authority refused to make an EHC plan").check();
  await submit(page);

  // About you
  await goToTask(page, "Your name");
  await fillText(page, "First name", "Nkechi");
  await fillText(page, "Last name", "Okonjo");
  await submit(page);
  await fillText(page, "What is your relationship to the child or young person?", "Mother");
  await submit(page);
  await fillText(page, "Phone number", "07700 900123");
  await fillText(page, "Email address", "nkechi@example.com");
  await submit(page);
  await fillText(page, "Address line 1", "12 Fern Road");
  await fillText(page, "Town or city", "Leeds");
  await fillText(page, "Postcode", "LS1 4AB");
  await submit(page);

  // Other people involved — all "No", which is the common case
  await goToTask(page, "Another parent or carer");
  await page.getByLabel("No").check();
  await submit(page);
  await goToTask(page, "A representative");
  await page.getByLabel("No").check();
  await submit(page);
  await goToTask(page, "An advocate");
  await page.getByLabel("No").check();
  await submit(page);
  await goToTask(page, "Who the tribunal should contact");
  await page.getByLabel("The named parent or carer").check();
  await submit(page);
  await fillText(page, "First name", "Nkechi");
  await fillText(page, "Last name", "Okonjo");
  await fillText(page, "Email address", "nkechi@example.com");
  await submit(page);
  await fillText(page, "Address line 1", "12 Fern Road");
  await fillText(page, "Town or city", "Leeds");
  await fillText(page, "Postcode", "LS1 4AB");
  await submit(page);
  await goToTask(page, "Anyone else with parental responsibility");
  await page.getByLabel("No").check();
  await submit(page);

  // Your reasons
  await goToTask(page, "Why you are appealing");
  await fillText(
    page,
    "What are your reasons for appealing?",
    "The plan does not describe her speech and language needs, and she has had no support since September."
  );
  await submit(page);
  await goToTask(page, "Health and social care recommendations");
  await page.getByLabel("No").check();
  await submit(page);

  // Mediation and deadlines. A date inside the two months, so the late-appeal question
  // does not apply.
  await goToTask(page, "The date on the decision letter");
  await fillDate(page, "What is the date on the local authority's decision letter?", recentDate());
  await submit(page);
  await submit(page); // the optional mediation certificate date, left blank
  await goToTask(page, "Your mediation certificate");
  await page.getByLabel("Yes").check();
  await submit(page);

  // Other cases
  await goToTask(page, "Other SEND appeals");
  await page.getByLabel("No").check();
  await submit(page);
  await goToTask(page, "Other court or tribunal cases");
  await page.getByLabel("No").check();
  await submit(page);

  // The hearing and support
  await goToTask(page, "The type of hearing you would prefer");
  await page.getByLabel("A hearing I can attend by video or in person").check();
  await submit(page);
  await page.getByLabel("No").check();
  await submit(page);
  await page.getByLabel("Yes").check();
  await submit(page);
  await goToTask(page, "An interpreter");
  await page.getByLabel("No").check();
  await submit(page);
  await goToTask(page, "Reasonable adjustments");
  await page.getByLabel("No").check();
  await submit(page);

  // Documents and evidence
  await goToTask(page, "The documents you are sending");
  await page.getByLabel("A copy of the local authority's decision letter").check();
  await submit(page);
  await fillText(page, "What is the evidence?", "Speech and language therapist's report");
  await page.getByRole("button", { name: "Add this evidence" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
}

/** A decision-letter date a few days ago, so the appeal is always comfortably in time. */
export function recentDate(): { day: string; month: string; year: string } {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return { day: String(date.getDate()), month: String(date.getMonth() + 1), year: String(date.getFullYear()) };
}
