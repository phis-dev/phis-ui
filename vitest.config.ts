import { defineConfig } from "vitest/config";

/**
 * Unit tests for the logic in this package, and deliberately nothing else.
 *
 * Node environment, no jsdom, no React rendering. What is worth testing here are the pure functions --
 * the access evaluator, the config parsers, the descriptor compiler, the ordering rules -- and opening
 * component testing would bring a much heavier habit into a package with hundreds of Client files.
 *
 * The `scripts/validate-*` chain stays where it is. Those are not unit tests: they walk the complete,
 * real catalog and assert invariants over all of it, which fixtures would defeat.
 */
export default defineConfig({
  test: {
    environment: "node",
    clearMocks: true,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
