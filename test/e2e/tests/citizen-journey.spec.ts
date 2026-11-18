import { expect, test } from "@playwright/test";
import { expectNoAccessibilityViolations } from "../helpers/accessibility.js";
import {
  completeAppeal,
  dismissCookieBanner,
  expectTaskComplete,
  fillDate,
  fillText,
  goToTask,
  recentDate,
  signInAsCitizen,
  startAsParent,
  submit
} from "../helpers/appeal.js";

/**
 * The citizen journey, end to end against the local CFT stack.
 *
 * The final spec is the one that matters: an appeal completed in this service becomes a
 * StSend35 case in CCD with a reference the citizen can quote. Everything before it checks
 * the parts of the journey a caseworker would otherwise find broken only from a case that
 * arrived half-answered.
 */

test.describe("the appeal journey", () => {
  test("should let somebody read what they are getting into before signing in", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Appeal a decision about an education, health and care (EHC) plan");
    // The three things that decide whether this service is theirs at all.
    await expect(page.getByText("You must appeal within 2 months")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mediation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "If the child or young person has not been assessed" })).toBeVisible();
    await expectNoAccessibilityViolations(page, "the start page");
  });

  test("should ask who is appealing before asking anyone to sign in", async ({ page }) => {
    await page.goto("/appeal/who-is-appealing");

    await expect(page.getByRole("heading", { name: "Who is making the appeal?" })).toBeVisible();
    await expectNoAccessibilityViolations(page, "who is appealing");
  });

  test("should send an anonymous visitor to sign in at the first question about the appeal", async ({ page }) => {
    await page.goto("/appeal/task-list");

    // Asserted on the host, not on IDAM's markup: the simulator and real IDAM serve
    // different forms, and either is a correct outcome here. What matters is that the
    // app handed off rather than showing the task list to somebody anonymous.
    await expect(page).toHaveURL(/idam-web-public|localhost:5062/);
  });

  test("should turn a young person under compulsory school age away, and say why", async ({ page }) => {
    await page.goto("/appeal/who-is-appealing");
    await dismissCookieBanner(page);
    await page.getByLabel("I am appealing for myself, as a young person").check();
    await submit(page);

    await expect(page.getByRole("heading", { name: "Are you over compulsory school age and under 25?" })).toBeVisible();
    await page.getByLabel("No").check();
    await submit(page);

    await expect(page.getByRole("heading", { name: "You cannot use this service" })).toBeVisible();
    await expect(page.getByText("a parent or carer can appeal for you")).toBeVisible();
    await expectNoAccessibilityViolations(page, "the dead end");
  });

  test("should show an error summary that links to the field, not just a red box", async ({ page }) => {
    await page.goto("/appeal/who-is-appealing");
    await dismissCookieBanner(page);
    await submit(page);

    const summary = page.locator(".govuk-error-summary");
    await expect(summary).toContainText("There is a problem");
    await expect(summary.getByRole("link", { name: "Select who is making the appeal" })).toBeVisible();

    // The summary link has to move focus to the input, or it is decoration.
    await summary.getByRole("link").click();
    await expect(page.getByLabel("I am appealing for a child, as their parent or carer")).toBeFocused();
    await expectNoAccessibilityViolations(page, "who is appealing, with an error");
  });

  test("should keep what the citizen typed when validation fails", async ({ page }) => {
    await startAsParent(page);
    await signInAsCitizen(page);

    await fillText(page, "First name", "Amara");
    await submit(page);

    await expect(page.locator(".govuk-error-summary")).toContainText("Enter their last name");
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Amara");
  });

  test("should mark a task completed once it is answered", async ({ page }) => {
    await startAsParent(page);
    await signInAsCitizen(page);

    await fillText(page, "First name", "Amara");
    await fillText(page, "Last name", "Okonjo");
    await submit(page);

    await expectTaskComplete(page, "Their name");
    await expectNoAccessibilityViolations(page, "the task list");
  });

  test("should not offer the plan-section questions on a refusal to make a plan", async ({ page }) => {
    await startAsParent(page);
    await signInAsCitizen(page);

    await goToTask(page, "What you are appealing about");
    await page.getByLabel("The local authority refused to make an EHC plan").check();
    await submit(page);

    // There is no plan, so there is nothing in Sections B, F or I to disagree with.
    await expect(page.getByRole("link", { name: "The parts of the plan you disagree with" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "The school, college or education provider" })).toHaveCount(0);
  });

  test("should drop the mediation certificate for a Section I-only appeal", async ({ page }) => {
    await startAsParent(page);
    await signInAsCitizen(page);

    await goToTask(page, "What you are appealing about");
    await page.getByLabel("I disagree with something written in Section B, F or I of the EHC plan").check();
    await submit(page);

    await expect(page.getByRole("heading", { name: "Which parts of the EHC plan do you disagree with?" })).toBeVisible();
    await page.getByLabel("Section I — the school, college or education provider named in the plan").check();
    await submit(page);

    // The one statutory exemption: an appeal only about which provider is named needs no
    // mediation certificate.
    await page.goto("/appeal/task-list");
    await expect(page.getByRole("link", { name: "Your mediation certificate" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "The school, college or education provider" })).toBeVisible();
  });

  test("should ask a late appellant to explain, rather than stopping them", async ({ page }) => {
    await startAsParent(page);
    await signInAsCitizen(page);

    await goToTask(page, "The date on the decision letter");
    await fillDate(page, "What is the date on the local authority's decision letter?", { day: "1", month: "1", year: "2020" });
    await submit(page);
    await submit(page); // no mediation certificate date

    // The tribunal decides whether a late appeal proceeds, so being late is a question and
    // not a dead end.
    await expect(page).toHaveURL(/late-appeal-reason/);
    await expect(page.getByText("a tribunal judge will decide whether it can go ahead")).toBeVisible();
    await expectNoAccessibilityViolations(page, "the late appeal explanation");
  });

  test("should refuse to submit an appeal that is not finished", async ({ page }) => {
    await startAsParent(page);
    await signInAsCitizen(page);

    await page.goto("/appeal/check-answers");

    await expect(page.getByText("Not answered").first()).toBeVisible();
    // A GOV.UK button with an href renders as <a role="button">, not a link.
    await expect(page.getByRole("button", { name: "Continue to the declaration" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Back to the task list" })).toBeVisible();
    await expectNoAccessibilityViolations(page, "check answers, incomplete");
  });

  test("should send a completed appeal to CCD and give the citizen its reference", async ({ page }) => {
    // The one test that answers every question, so it is the one test the default 30 seconds
    // does not fit: 50-odd navigations, three axe scans and a real round trip to CCD. Against a
    // deployed environment each navigation is a network hop rather than localhost. Raised here
    // rather than in the config so the other specs keep a timeout tight enough to be useful.
    test.setTimeout(180_000);

    await completeAppeal(page);

    await page.goto("/appeal/check-answers");
    await expect(page.getByRole("heading", { name: "Check your answers before sending your appeal" })).toBeVisible();
    await expect(page.getByText("Amara Okonjo")).toBeVisible();
    await expectNoAccessibilityViolations(page, "check answers, complete");

    await page.getByRole("button", { name: "Continue to the declaration" }).click();

    await page
      .getByLabel("I confirm, as the person completing this appeal on behalf of the child or young person, that the facts stated in it are true")
      .check();
    await page.getByLabel("Parent or carer").check();
    await fillText(page, "Full name", "Nkechi Okonjo");
    await fillText(page, "Signature", "Nkechi Okonjo");
    await fillDate(page, "Date", recentDate());
    await expectNoAccessibilityViolations(page, "the declaration");
    await page.getByRole("button", { name: "Accept and send your appeal" }).click();

    await expect(page.getByRole("heading", { name: "Appeal sent" })).toBeVisible();
    // CCD's 16-digit case reference, in the groups of four a citizen has to read out.
    await expect(page.locator(".govuk-panel")).toContainText(/\d{4} \d{4} \d{4} \d{4}/);
    await expect(page.getByText("within 10 working days")).toBeVisible();
    await expectNoAccessibilityViolations(page, "the confirmation page");
  });

  test("should not show a confirmation to somebody who has not submitted", async ({ page }) => {
    await startAsParent(page);
    await signInAsCitizen(page);

    await page.goto("/appeal/confirmation");

    // Telling somebody their appeal has been sent when it has not is the worst thing this
    // page could do, so it sends them back to the start instead.
    await expect(page).toHaveURL("/");
  });
});
