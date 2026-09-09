import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    passWithNoTests: true,
    include: ["src/**/*.test.ts"],
    // *.a11y.test.ts is run by `yarn test:a11y`, which the pipeline calls separately —
    // excluded here so CI does not run the axe sweep twice.
    exclude: ["node_modules", "dist", "test", "**/__fixtures__/**", "**/*.a11y.test.ts"],
    coverage: {
      reporter: ["lcov", "text"],
      reportsDirectory: "coverage"
    }
  }
});
