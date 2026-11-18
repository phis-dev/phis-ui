import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolvePhiSplitCardColumns, resolvePhiSplitCardGroundFrame } from "./split-card-geometry";
import { PhiSplitCardLayout } from "./clients/phi-split-card-layout-client";
import { PHI_SPLIT_CARD_LAYOUT_DEFINITION } from "./layout-definitions";
import { parsePhiCmsSplitCardLayoutConfig } from "../../types/cms-config";
import { isPhiConfigError } from "../widgets/config/strict-config-reader";
import { findPhiCmsConfigViolations } from "../../helpers/cms-config-field-validation";

describe("the Split Card ratio", () => {
  it("reads every ratio it offers", () => {
    for (const ratio of ["golden", "50-50", "20-80"] as const) {
      expect(parsePhiCmsSplitCardLayoutConfig({ ratio }).ratio).toBe(ratio);
    }
  });

  it("reads an absent ratio as φ", () => {
    expect(parsePhiCmsSplitCardLayoutConfig({}).ratio).toBe("golden");
    expect(parsePhiCmsSplitCardLayoutConfig({ ratio: "" }).ratio).toBe("golden");
  });

  it("refuses a ratio it does not offer, and one of the wrong type", () => {
    for (const ratio of ["30-70", "50/50", 0.5, true]) {
      let caught: unknown = null;
      try {
        parsePhiCmsSplitCardLayoutConfig({ ratio });
      } catch (error) {
        caught = error;
      }
      expect(isPhiConfigError(caught)).toBe(true);
      expect((caught as Error).message).toContain("ratio");
    }
  });

  it.each([
    ["golden", false, "minmax(0, 1fr) minmax(0, 1.61803398875fr)"],
    ["golden", true, "minmax(0, 1.61803398875fr) minmax(0, 1fr)"],
    ["50-50", false, "minmax(0, 1fr) minmax(0, 1fr)"],
    ["50-50", true, "minmax(0, 1fr) minmax(0, 1fr)"],
    ["20-80", false, "minmax(0, 1fr) minmax(0, 4fr)"],
    ["20-80", true, "minmax(0, 4fr) minmax(0, 1fr)"],
  ] as const)("stands %s (swapped: %s) in %s", (ratio, swapped, columns) => {
    expect(resolvePhiSplitCardColumns(swapped, ratio)).toBe(columns);
  });

  it("keeps the golden columns of before when no ratio is stated", () => {
    expect(resolvePhiSplitCardColumns()).toBe("minmax(0, 1fr) minmax(0, 1.61803398875fr)");
    expect(resolvePhiSplitCardColumns(true)).toBe("minmax(0, 1.61803398875fr) minmax(0, 1fr)");
  });

  it.each([
    ["golden", false, "((100cqw - 20px) / 2.61803398875)"],
    ["golden", true, "((100cqw - 20px) * 1.61803398875 / 2.61803398875)"],
    ["50-50", false, "((100cqw - 20px) / 2)"],
    ["50-50", true, "((100cqw - 20px) / 2)"],
    ["20-80", false, "((100cqw - 20px) / 5)"],
    ["20-80", true, "((100cqw - 20px) * 4 / 5)"],
  ] as const)("starts the right card's Background past the left card at %s (swapped: %s)", (ratio, swapped, leftWidth) => {
    expect(resolvePhiSplitCardGroundFrame("right", "20px", swapped, ratio).left)
      .toBe(`var(--phi-split-card-ground-left, calc(-1 * (${leftWidth} + 20px)))`);
    expect(resolvePhiSplitCardGroundFrame("left", "20px", swapped, ratio).left).toBe("var(--phi-split-card-ground-left, 0px)");
  });

  it("draws the ratio into the grid", () => {
    const markup = renderToStaticMarkup(createElement(PhiSplitCardLayout, {
      slots: [null, null],
      ratio: "20-80",
      swapRatio: true,
    }));
    expect(markup).toContain("--phi-split-card-columns:minmax(0, 4fr) minmax(0, 1fr)");
  });

  it("offers Ratio above Swap ratio, hides the switch at 50/50 and stores nothing for φ", () => {
    const keys = PHI_SPLIT_CARD_LAYOUT_DEFINITION.fields.map((field) => field.key);
    expect(keys.indexOf("ratio")).toBe(keys.indexOf("swapRatio") - 1);
    const ratio = PHI_SPLIT_CARD_LAYOUT_DEFINITION.fields.find((field) => field.key === "ratio");
    const swap = PHI_SPLIT_CARD_LAYOUT_DEFINITION.fields.find((field) => field.key === "swapRatio");
    expect(ratio).toMatchObject({ type: "choice", presentation: "segmented", emptyOption: { value: "golden", label: "φ" } });
    if (!ratio || !swap) return;
    // How the Inspector reads the rule is the Builder's test (inspector-layout-field-visibility.test.ts).
    expect(swap).toMatchObject({ visibleWhen: { field: "ratio", notEquals: "50-50" } });
    expect(findPhiCmsConfigViolations([ratio], { ratio: "50-50" })).toEqual([]);
    expect(findPhiCmsConfigViolations([ratio], { ratio: "30-70" })).not.toEqual([]);
  });
});
