import { describe, expect, it } from "vitest";

import { PHI_BACKGROUND_BLUR_FILTER } from "../components/widgets/config/background";
import { readPhiSurface } from "../types/surface";
import { phiSurfaceDrawsChrome, resolvePhiSurfaceStyle } from "./surface-style";
import { PHI_THEME_BORDER_LINE } from "./border-widget-style";

const picture = {
  base: { kind: "image" as const, sourceKind: "url" as const, sourceUrl: "https://example.test/ground.jpg" },
};

describe("reading a Surface", () => {
  it("reads nothing as nothing", () => {
    expect(readPhiSurface(null)).toBeNull();
    expect(readPhiSurface({})).toBeNull();
    expect(readPhiSurface("red")).toBeNull();
    expect(readPhiSurface({ tone: "inherit" })).toBeNull();
  });

  it("reads each part with the reader that owns it", () => {
    expect(readPhiSurface({
      background: { base: { kind: "color", color: "#123456" }, filter: "glass", effect: "dim" },
      borderSource: "custom",
      border: { borderWidth: 2, borderStyle: "solid", borderColor: "#000", borderTopLeftRadius: 8 },
      shadow: "soft",
      tone: "dark",
      padding: 13,
    })).toEqual({
      background: { base: { kind: "color", color: "#123456" }, overlay: null, filter: "glass", motion: null },
      borderSource: "custom",
      border: { borderWidth: 2, borderStyle: "solid", borderColor: "#000", borderTopLeftRadius: 8 },
      shadow: "soft",
      tone: "dark",
    });
  });

  it("drops what no part reads", () => {
    expect(readPhiSurface({ borderSource: "dashed", shadow: "huge", tone: "sepia" })).toBeNull();
  });
});

describe("a Surface as CSS", () => {
  it("draws nothing for no Surface", () => {
    expect(resolvePhiSurfaceStyle(null)).toEqual({ style: {}, ground: null, paintsGround: false });
  });

  it("paints a plain ground on the box", () => {
    const resolved = resolvePhiSurfaceStyle({ background: { base: { kind: "color", color: "#123456" } } });
    expect(resolved.style.backgroundColor).toBe("#123456");
    expect(resolved.ground).toBeNull();
    expect(resolved.paintsGround).toBe(true);
  });

  it("states no line when nobody asked for one, so a line underneath does not survive", () => {
    expect(resolvePhiSurfaceStyle({ shadow: "soft" }).style.border).toBe("none");
  });

  it("draws the Site's line under theme and the configured one under custom", () => {
    expect(resolvePhiSurfaceStyle({ borderSource: "theme" }).style.border).toBe(PHI_THEME_BORDER_LINE);
    expect(resolvePhiSurfaceStyle({
      border: { borderWidth: 2, borderStyle: "dashed", borderColor: "#f00" },
    }).style.border).toBe("2px dashed #f00");
  });

  it("answers an unstated corner with the fallback, as longhands", () => {
    const style = resolvePhiSurfaceStyle({ borderSource: "theme" }, { cornerFallback: "var(--phi-surface-radius, 0)" }).style;
    expect(style.borderRadius).toBeUndefined();
    expect(style.borderTopLeftRadius).toBe("var(--phi-surface-radius, 0)");
    expect(style.borderBottomRightRadius).toBe("var(--phi-surface-radius, 0)");
  });

  it("keeps a configured corner only under custom", () => {
    const border = { borderWidth: 1, borderStyle: "solid" as const, borderColor: "#000", borderTopLeftRadius: 12 };
    const custom = resolvePhiSurfaceStyle({ borderSource: "custom", border }, { cornerFallback: 4 }).style;
    expect(custom.borderTopLeftRadius).toBe(12);
    expect(custom.borderTopRightRadius).toBe(4);
    const theme = resolvePhiSurfaceStyle({ borderSource: "theme", border }, { cornerFallback: 4 }).style;
    expect(theme.borderTopLeftRadius).toBe(4);
  });

  it("combines a pane's depth with the configured shadow", () => {
    const style = resolvePhiSurfaceStyle({ shadow: { kind: "custom", value: "0 1px 2px red" } }).style;
    expect(style.boxShadow).toBe("0 1px 2px red");
  });

  it("frosts the box under a glass pane and needs no layer for it", () => {
    const resolved = resolvePhiSurfaceStyle({ background: { base: { kind: "color", color: "#123456" }, filter: "glass" } });
    expect(resolved.style.backdropFilter).toBe("blur(24px) saturate(1.2)");
    expect(resolved.ground).toBeNull();
  });

  it("moves a softened paint onto a layer and keeps the box sharp", () => {
    const resolved = resolvePhiSurfaceStyle({ background: { ...picture, filter: "blur" } });
    expect(resolved.style.filter).toBeUndefined();
    expect(resolved.style.backgroundImage).toBeUndefined();
    expect(resolved.style.isolation).toBe("isolate");
    expect(resolved.ground?.filter).toBe(PHI_BACKGROUND_BLUR_FILTER);
    expect(resolved.ground?.paint.backgroundImage).toBe('url("https://example.test/ground.jpg")');
    expect(resolved.ground?.motion).toBeNull();
  });

  it("hands a moving picture to the motion layer", () => {
    const resolved = resolvePhiSurfaceStyle({ background: { ...picture, motion: { mode: "parallax" } } });
    expect(resolved.ground?.motion?.base.kind).toBe("image");
    expect(resolved.style.backgroundImage).toBeUndefined();
  });

  it("puts the paint on a layer when the caller needs to move it", () => {
    const resolved = resolvePhiSurfaceStyle({ background: picture }, { forceGroundLayer: true });
    expect(resolved.ground?.filter).toBeNull();
    expect(resolved.style.backgroundImage).toBeUndefined();
  });

  it("never makes a layer for nothing", () => {
    expect(resolvePhiSurfaceStyle({ background: { base: { kind: "none" } } }, { forceGroundLayer: true }).ground).toBeNull();
  });
});

describe("whether a Surface draws chrome", () => {
  it("is false for nothing and for a stated absence", () => {
    expect(phiSurfaceDrawsChrome(null)).toBe(false);
    expect(phiSurfaceDrawsChrome({ background: { base: { kind: "none" } }, borderSource: "none", shadow: "none" })).toBe(false);
  });

  it("is true for a ground, a line, or depth", () => {
    expect(phiSurfaceDrawsChrome({ background: { base: { kind: "color", color: "#fff" } } })).toBe(true);
    expect(phiSurfaceDrawsChrome({ borderSource: "theme" })).toBe(true);
    expect(phiSurfaceDrawsChrome({ shadow: "soft" })).toBe(true);
  });
});

describe("a Surface on a box that cannot carry a layer", () => {
  it("keeps the paint on the box", () => {
    const resolved = resolvePhiSurfaceStyle({ background: { ...picture, filter: "blur" } }, { groundLayer: false });
    expect(resolved.ground).toBeNull();
    expect(resolved.style.backgroundImage).toBe('url("https://example.test/ground.jpg")');
    expect(resolved.style.filter).toBeUndefined();
  });
});
