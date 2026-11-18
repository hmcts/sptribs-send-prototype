import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.TEST_URL ?? "http://localhost:3211";

// These specs drive the real OIDC flow, so they need cftlib's IDAM simulator running
// (`./gradlew bootWithCCD -PlocalAuth` in sptribs-case-api) alongside the app
// (`yarn dev`). See README.md.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  /**
   * One worker, because every spec here shares one local stack.
   *
   * `fullyParallel: false` alone is not enough: it serialises tests *within* a file, but
   * Playwright still runs separate files in parallel, one worker per core. On a 128-core
   * machine that meant several specs signing in against the single IDAM simulator at once,
   * with some left sitting on its login form — a failure that looks exactly like a broken
   * journey and is nothing of the kind.
   *
   * Nothing is lost: these specs are navigation-bound, not compute-bound.
   */
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    baseURL,
    /**
     * Screenshots and video only — deliberately no `trace`.
     *
     * The full journey is 40-odd navigations per spec, and a trace retains a snapshot
     * and the whole resource set for each one. On the sibling repo that was enough to
     * kill the worker with `FATAL ERROR: Ineffective mark-compacts near heap limit` at a
     * 4GB heap — the *runner* running out of memory, with nothing wrong in the product.
     *
     * A failure screenshot plus the spec's own assertion message is enough to diagnose
     * these. Turn tracing back on for a single spec if you need it, not suite-wide.
     */
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true,
    // Chromium needs --no-sandbox in containers, and --disable-software-rasterizer
    // (alongside --disable-gpu) to stop the renderer hanging where no GPU/GL is
    // available (e.g. this devcontainer) — without it, page loads and DOM reads
    // time out. All four flags are no-ops on a normal desktop.
    launchOptions: {
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--disable-software-rasterizer"]
    }
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"] } }]
});
