import { describe, expect, it } from "vitest";

import { PHI_SHADOW_DEFINITIONS } from "../helpers/layout-style";
import { buildPhiSurfaceShadowTokens, readPhiSurfaceShadowDepth } from "./phi-surface-shadow";

describe("the Surface shadow steps", () => {
  it("draw the house's own variables, not Ant Design's menu shadows", () => {
    expect(PHI_SHADOW_DEFINITIONS.soft).toBe("var(--phi-surface-shadow-soft)");
    expect(PHI_SHADOW_DEFINITIONS.strong).toBe("var(--phi-surface-shadow-strong)");
  });

  it("are normal where the Theme says nothing, and a stated depth otherwise", () => {
    expect(readPhiSurfaceShadowDepth(null, "soft")).toBe("normal");
    expect(readPhiSurfaceShadowDepth({ strong: "pronounced" }, "strong")).toBe("pronounced");
    expect(readPhiSurfaceShadowDepth({ soft: "deep" as never }, "soft")).toBe("normal");
  });

  it("write each mode's own CSS, darker in the dark", () => {
    const light = buildPhiSurfaceShadowTokens(null, "light");
    const dark = buildPhiSurfaceShadowTokens(null, "dark");
    expect(light.surfaceShadowStrong).toContain("0 12px 32px rgba(0, 0, 0, 0.16)");
    expect(dark.surfaceShadowStrong).toContain("0 12px 32px rgba(0, 0, 0, 0.55)");
    expect(buildPhiSurfaceShadowTokens({ soft: "flat" }, "light").surfaceShadowSoft).not.toBe(light.surfaceShadowSoft);
  });
});
