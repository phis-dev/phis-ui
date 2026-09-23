import { defineConfig } from "vitest/config";

/**
 * Unit tests for the logic in this package, and deliberately nothing else.
 *
 * Node environment by default, and the default is the policy: what is worth testing here are the pure
 * functions -- the access evaluator, the config parsers, the descriptor compiler, the ordering rules --
 * and opening component testing would bring a much heavier habit into a package with hundreds of Client
 * files.
 *
 * **A binding is not a component.** A file that needs React may say so for itself with
 * `// @vitest-environment happy-dom` on its first line, and `components/runtime/*-binding.test.ts` does.
 * A binding holds state and answers questions about it; that it uses hooks to do so is how React works,
 * not a reason to leave it unproven -- and the alternative, shaping a binding so that it can be tested
 * without React, lets the test runner decide the design. What stays out is rendering to assert on
 * markup: a Widget's output is the Site's business, and the `scripts/validate-*` chain and the browser
 * tests in `/opt/projects/browser-test` are where that is answered.
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
