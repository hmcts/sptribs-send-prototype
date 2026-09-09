import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    passWithNoTests: true,
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "test", "**/__fixtures__/**"],
    coverage: {
      reporter: ["lcov", "text"],
      reportsDirectory: "coverage"
    }
  }
});
