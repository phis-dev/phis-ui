import { describe, expect, it } from "vitest";

import {
  resolvePhiRootBackgroundLayerStyle,
  resolvePhiRootBackgroundMotion,
} from "./phi-root-background";

/**
 * The layer owns the page ground: unconfigured it must paint exactly the bgLayout fallback the
 * `.ant-app` rule used to paint, and a configured mode must win over that fallback.
 */
describe("root background layer style", () => {
  it("falls back to the layout background when nothing is configured", () => {
    const style = resolvePhiRootBackgroundLayerStyle(null, "light");
    expect(style.backgroundColor).toBe("var(--ant-color-bg-layout)");
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
    expect(dark.backgroundColor).toBe("var(--ant-color-bg-layout)");
  });

  it("keeps the fallback ground under an explicit \"none\" base", () => {
    const style = resolvePhiRootBackgroundLayerStyle(
      { background: { light: { base: { kind: "none" as const } } } },
      "light",
    );
    expect(style.backgroundColor).toBe("var(--ant-color-bg-layout)");
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

/**
 * `fixed` holds an image still while its host travels past it, and this layer never travels. Only
 * `parallax` survives here, and where it does the image belongs to the motion layer alone.
 */
describe("root background motion", () => {
  const image = {
    kind: "image" as const,
    sourceKind: "url" as const,
    sourceUrl: "https://example.test/ground.jpg",
  };

  it("resolves parallax for the configured mode", () => {
    const motion = resolvePhiRootBackgroundMotion(
      { background: { light: { base: image, motion: { mode: "parallax" as const, strength: 0.4 } } } },
      "light",
    );
    expect(motion?.mode).toBe("parallax");
    expect(motion?.strength).toBe(0.4);
  });

  it("ignores a stored fixed mode and keeps painting the static ground", () => {
    const root = { background: { light: { base: image, motion: { mode: "fixed" as const } } } };
    expect(resolvePhiRootBackgroundMotion(root, "light")).toBeNull();
    expect(resolvePhiRootBackgroundLayerStyle(root, "light").backgroundImage).toBe(
      'url("https://example.test/ground.jpg")',
    );
  });

  it("hands the image to the motion layer and keeps only the fallback ground", () => {
    const style = resolvePhiRootBackgroundLayerStyle(
      { background: { dark: { base: image, motion: { mode: "parallax" as const } } } },
      "dark",
    );
    expect(style.backgroundImage).toBeUndefined();
    expect(style.backgroundColor).toBe("var(--ant-color-bg-layout)");
    expect(style.position).toBe("fixed");
  });

  it("keeps motion out of a mode that has no image", () => {
    expect(
      resolvePhiRootBackgroundMotion(
        { background: { light: { base: { kind: "color" as const, color: "#101018" }, motion: { mode: "parallax" as const } } } },
        "light",
      ),
    ).toBeNull();
  });
});
