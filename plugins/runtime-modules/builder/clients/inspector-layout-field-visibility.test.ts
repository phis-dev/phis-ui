import { describe, expect, it } from "vitest";

import {
  PHI_SPLIT_CARD_LAYOUT_DEFINITION,
  PHI_THREE_COLUMN_LAYOUT_DEFINITION,
} from "../../../../components/layouts/layout-definitions";
import { isPhiInspectorConfigFieldVisible } from "./inspector-config-field";

/*
 * The Layouts state when a field shows; the Inspector is what reads it. Tested here, on the Builder's
 * side, because the Foundation may not reach into a Module (MODULES.md, "The dependency rule").
 */
describe("the Layout fields the Inspector shows only sometimes", () => {
  const field = (fields: readonly { key: string }[], key: string) => fields.find((entry) => entry.key === key) as never;

  it("offers the Three Column's side width only while the sides are balanced", () => {
    const sideShare = field(PHI_THREE_COLUMN_LAYOUT_DEFINITION.fields, "sideShare");
    expect(isPhiInspectorConfigFieldVisible(sideShare, { balancedSides: true })).toBe(true);
    expect(isPhiInspectorConfigFieldVisible(sideShare, { balancedSides: false })).toBe(false);
  });

  it("hides the Split Card's swap switch at 50/50, where no side is the larger", () => {
    const swap = field(PHI_SPLIT_CARD_LAYOUT_DEFINITION.fields, "swapRatio");
    expect(isPhiInspectorConfigFieldVisible(swap, {})).toBe(true);
    expect(isPhiInspectorConfigFieldVisible(swap, { ratio: "20-80" })).toBe(true);
    expect(isPhiInspectorConfigFieldVisible(swap, { ratio: "50-50" })).toBe(false);
  });
});
