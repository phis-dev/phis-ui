import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiThreeColumnLayout, resolvePhiThreeColumnFlex } from "./phi-three-column-layout-client";
import { parsePhiCmsThreeColumnLayoutConfig } from "../../../types/cms-config";
import { isPhiConfigError } from "../../widgets/config/strict-config-reader";
import { PHI_THREE_COLUMN_LAYOUT_DEFINITION } from "../layout-definitions";
import { findPhiCmsConfigViolations } from "../../../helpers/cms-config-field-validation";

function side(grow: number) {
  return `var(--phi-three-column-side-flex, ${grow} 1 0)`;
}

function middle(grow: number) {
  return `var(--phi-three-column-middle-flex, ${grow} 1 0)`;
}

describe("the Three Column side share", () => {
  it("reads every share it offers", () => {
    for (const share of [10, 20, 25, 30, 33] as const) {
      expect(parsePhiCmsThreeColumnLayoutConfig({ sideShare: share }).sideShare).toBe(share);
    }
  });

  it("reads an absent share as 25", () => {
    expect(parsePhiCmsThreeColumnLayoutConfig({}).sideShare).toBe(25);
    expect(parsePhiCmsThreeColumnLayoutConfig({ sideShare: null }).sideShare).toBe(25);
  });

  it("refuses a share it does not offer, and one of the wrong type", () => {
    for (const sideShare of [15, 50, "25", true]) {
      let caught: unknown = null;
      try {
        parsePhiCmsThreeColumnLayoutConfig({ sideShare });
      } catch (error) {
        caught = error;
      }
      expect(isPhiConfigError(caught)).toBe(true);
      expect((caught as Error).message).toContain("sideShare");
    }
  });

  it.each([
    [10, 80],
    [20, 60],
    [25, 50],
    [30, 40],
    [33, 34],
  ] as const)("grows each side by %i and the middle by %i", (share, rest) => {
    expect(resolvePhiThreeColumnFlex({ sideShare: share })).toEqual({
      left: side(share),
      middle: middle(rest),
      right: side(share),
    });
  });

  it("keeps the 1 : 2 : 1 of before when no share is stated", () => {
    expect(resolvePhiThreeColumnFlex({})).toEqual({ left: side(25), middle: middle(50), right: side(25) });
  });

  it("lets a fixed width win over the share", () => {
    expect(resolvePhiThreeColumnFlex({ sideShare: 10, leftWidth: 120, middleWidth: "40rem" })).toEqual({
      left: "0 0 120px",
      middle: "0 0 40rem",
      right: side(10),
    });
    expect(resolvePhiThreeColumnFlex({ sideShare: 33, rightWidth: "12rem" }).right).toBe("0 0 12rem");
  });

  it("does nothing without balanced sides", () => {
    expect(resolvePhiThreeColumnFlex({ balancedSides: false, sideShare: 10 })).toEqual({
      left: "0 1 auto",
      middle: middle(2),
      right: "0 1 auto",
    });
  });

  it("draws the share into the columns", () => {
    const markup = renderToStaticMarkup(createElement(PhiThreeColumnLayout, {
      slots: [null, null, null],
      sideShare: 30,
    }));
    expect(markup).toContain("flex:var(--phi-three-column-side-flex, 30 1 0)");
    expect(markup).toContain("flex:var(--phi-three-column-middle-flex, 40 1 0)");
  });

  it("offers the share only while the sides are balanced, and stores nothing for 25", () => {
    const field = PHI_THREE_COLUMN_LAYOUT_DEFINITION.fields.find((entry) => entry.key === "sideShare");
    expect(field).toBeDefined();
    if (!field) return;
    // How the Inspector reads the rule is the Builder's test (inspector-layout-field-visibility.test.ts).
    expect(field.visibleWhen).toEqual({ field: "balancedSides", equals: true });
    expect(field).toMatchObject({ type: "choice", valueType: "number", emptyOption: { label: "25 %" } });
    expect(findPhiCmsConfigViolations([field], { sideShare: 33 })).toEqual([]);
    expect(findPhiCmsConfigViolations([field], { sideShare: 15 })).not.toEqual([]);
  });
});
