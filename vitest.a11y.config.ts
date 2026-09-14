import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

/**
 * The axe sweep over rendered markup, run by `yarn test:a11y`.
 *
 * A config of its own rather than a filter on the default one: the CNP nodejs pipeline calls
 * `yarn test` and `yarn test:a11y` as separate steps, and the default config deliberately
 * excludes `*.a11y.test.ts` so the sweep is not run twice.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ["src/**/*.a11y.test.ts"],
    exclude: ["node_modules", "dist", "**/__fixtures__/**"],
    // jsdom + axe over 50-odd pages twice (clean and error state) is slower than a unit test.
    testTimeout: 120_000
  }
});
