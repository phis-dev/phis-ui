import { describe, expect, it } from "vitest";

import { PHI_SURFACE_CARD, PHI_SURFACE_WASH } from "../../helpers/surface-presets";
import { PHI_INSPECTOR_TABLE_CONTROL_PROPS } from "../../helpers/cms-inspector-drawer";
import { PHI_COLOR } from "../../theme/antd-css-var-contract";
import { isPhiTableSurfaceDrawable, resolvePhiTableSurfaceGround } from "./phi-table-surface";

describe("a Table's Surface", () => {
  it("is drawn when it is one colour of ground and nothing else", () => {
    expect(isPhiTableSurfaceDrawable(PHI_SURFACE_WASH)).toBe(true);
    expect(isPhiTableSurfaceDrawable({})).toBe(true);
    expect(resolvePhiTableSurfaceGround(PHI_SURFACE_WASH)).toBe(PHI_COLOR.fillQuaternary);
  });

  it("is no ground at all for None, the inspector's Table", () => {
    expect(PHI_INSPECTOR_TABLE_CONTROL_PROPS.surface).toBeNull();
    expect(resolvePhiTableSurfaceGround(null)).toBe("transparent");
  });

  it("refuses a line, depth, a mode or a ground per mode: those are a box around the Table", () => {
    expect(isPhiTableSurfaceDrawable(PHI_SURFACE_CARD)).toBe(false);
    expect(isPhiTableSurfaceDrawable({ shadow: "soft" })).toBe(false);
    expect(isPhiTableSurfaceDrawable({ borderSource: "theme" })).toBe(false);
    expect(isPhiTableSurfaceDrawable({ tone: "inverse" })).toBe(false);
    expect(isPhiTableSurfaceDrawable({ backgroundDark: { base: { kind: "color", color: "#000" } } })).toBe(false);
    expect(isPhiTableSurfaceDrawable({ background: { base: { kind: "color", color: "#fff" }, filter: "glass" } })).toBe(false);
  });
});
