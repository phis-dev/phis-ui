import { describe, expect, it } from "vitest";

import { findPhiCmsConfigViolations } from "../../helpers/cms-config-field-validation";
import { PHI_CORE_LAYOUT_DEFINITIONS } from "./layout-definitions";

/**
 * Every Layout's own default config, judged by its own fields.
 *
 * `assertPhiCmsConfigFields` runs on every Inspector patch, and it judges the merged config -- which
 * includes the defaults. A default the fields do not allow therefore does not fail where it is
 * written; it fails later, in the Builder, as a thrown "Invalid <Layout> configuration" on an edit
 * that had nothing to do with it. `collapseSize: "middle"` sat in the Collapsible preset that way:
 * antd v6 still accepts the deprecated word, so it drew correctly and only the Inspector refused it.
 *
 * The presets are typed as `JsonRecord`, so nothing checks them against the contract they belong to.
 * This is that check, in the one place it can be made cheaply.
 */
describe("the layout default configs", () => {
  const definitions = PHI_CORE_LAYOUT_DEFINITIONS;

  it("has definitions to check", () => {
    expect(definitions.length).toBeGreaterThan(0);
  });

  for (const definition of definitions) {
    it(`${definition.title} states defaults its own fields accept`, () => {
      /* Not every definition declares either one, and a Layout without fields has nothing to break. */
      const described = definition as {
        fields?: Parameters<typeof findPhiCmsConfigViolations>[0];
        defaultConfig?: Record<string, unknown>;
      };
      const violations = findPhiCmsConfigViolations(
        described.fields ?? [],
        described.defaultConfig ?? {},
      );
      expect(violations).toEqual([]);
    });
  }
});
