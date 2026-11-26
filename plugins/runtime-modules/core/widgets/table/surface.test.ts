import { describe, expect, it } from "vitest";

import { PHI_SURFACE_CARD, PHI_SURFACE_WASH } from "../../../../../helpers/surface-presets";
import { PHI_COLOR } from "../../../../../theme/antd-css-var-contract";
import { resolvePhiTableSurfaceGround } from "../../../../../components/tables/phi-table-surface";
import { parsePhiTableWidgetConfig } from "./config";

describe("the Table Widget's presentation.surface", () => {
  const parse = (surface: unknown) => parsePhiTableWidgetConfig({ presentation: { columns: [], surface } }).presentation.surface;

  it("keeps None, a ground of one colour, and the Table's own ground when left out", () => {
    expect(parsePhiTableWidgetConfig({ presentation: { columns: [] } }).presentation.surface).toBeUndefined();
    expect(parse(null)).toBeNull();
    expect(resolvePhiTableSurfaceGround(parse(PHI_SURFACE_WASH) ?? null)).toBe(PHI_COLOR.fillQuaternary);
  });

  it("refuses a Surface the Table cannot draw", () => {
    expect(() => parse(PHI_SURFACE_CARD)).toThrow(/presentation\.surface/u);
    expect(() => parse("transparent")).toThrow(/presentation\.surface/u);
  });
});
