import { describe, expect, it } from "vitest";

import { resolvePhiRootBackgroundLayerStyle } from "./phi-root-background";

/**
 * The layer owns the page ground: unconfigured it must paint exactly the bgLayout fallback the
 * `.ant-app` rule used to paint, and a configured mode must win over that fallback.
 */
describe("root background layer style", () => {
  it("falls back to the layout background when nothing is configured", () => {
    const style = resolvePhiRootBackgroundLayerStyle(null, "light");
    expect(style.background).toBe("var(--ant-color-bg-layout)");
    expect(style.position).toBe("fixed");
    expect(style.zIndex).toBe(-1);
    expect(style.pointerEvents).toBe("none");
  });

  it("resolves the configured mode and leaves the other on the fallback", () => {
    const root = {
      background: {
        light: {
          base: {
            kind: "gradient" as const,
            direction: "to bottom" as const,
            stops: [
              { color: "#ffffff", percent: 0 },
              { color: "#e0e0ff", percent: 100 },
            ],
          },
        },
      },
    };
    const light = resolvePhiRootBackgroundLayerStyle(root, "light");
    expect(light.backgroundImage).toBe("linear-gradient(to bottom, #ffffff 0%, #e0e0ff 100%)");
    const dark = resolvePhiRootBackgroundLayerStyle(root, "dark");
    expect(dark.backgroundImage).toBeUndefined();
    expect(dark.background).toBe("var(--ant-color-bg-layout)");
  });

  it("keeps the fallback ground under an explicit \"none\" base", () => {
    const style = resolvePhiRootBackgroundLayerStyle(
      { background: { light: { base: { kind: "none" as const } } } },
      "light",
    );
    expect(style.background).toBe("var(--ant-color-bg-layout)");
    expect(style.backgroundImage).toBeUndefined();
  });

  it("paints a configured color over the fallback", () => {
    const style = resolvePhiRootBackgroundLayerStyle(
      { background: { dark: { base: { kind: "color" as const, color: "#101018" } } } },
      "dark",
    );
    expect(style.backgroundColor).toBe("#101018");
  });
});
