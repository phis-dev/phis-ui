import { describe, expect, it } from "vitest";

import {
  normalizePhiBackgroundWidgetConfig,
  phiBackgroundBaseSupportsGlassEffect,
  phiBackgroundWidgetConfigPaintsGround,
  resolvePhiBackgroundEffect,
  resolvePhiBackgroundWidgetStyle,
} from "./background";

/**
 * Glass frosts what shows through a surface. A base that paints its own opaque material is that
 * material rather than a pane above it, so the Effect resolves to nothing there instead of laying a
 * plain wash over the picture.
 */
describe("background glass effect", () => {
  const image = {
    kind: "image" as const,
    sourceKind: "url" as const,
    sourceUrl: "https://example.test/ground.jpg",
  };

  it("supports glass on a base that paints no material of its own", () => {
    expect(phiBackgroundBaseSupportsGlassEffect({ kind: "none" })).toBe(true);
    expect(phiBackgroundBaseSupportsGlassEffect({ kind: "color", color: "#101018" })).toBe(true);
  });

  it("withholds glass from an image and a gradient base", () => {
    expect(phiBackgroundBaseSupportsGlassEffect(image)).toBe(false);
    expect(
      phiBackgroundBaseSupportsGlassEffect({
        kind: "gradient",
        direction: "to bottom",
        stops: [
          { color: "#ffffff", percent: 0 },
          { color: "#000000", percent: 100 },
        ],
      }),
    ).toBe(false);
  });

  it("resolves a stored glass on an image base to no effect", () => {
    expect(resolvePhiBackgroundEffect({ base: image, effect: "glass" })).toBeNull();
    const style = resolvePhiBackgroundWidgetStyle({ base: image, effect: "glass" });
    expect(style.backdropFilter).toBeUndefined();
    expect(style.backgroundImage).toBe('url("https://example.test/ground.jpg")');
  });

  it("keeps every other effect on an image base", () => {
    expect(resolvePhiBackgroundEffect({ base: image, effect: "dim" })).toBe("dim");
    expect(resolvePhiBackgroundWidgetStyle({ base: image, effect: "dim" }).filter).toBe(
      "brightness(0.85)",
    );
  });

  it("still frosts a colour base", () => {
    const style = resolvePhiBackgroundWidgetStyle({
      base: { kind: "color", color: "#123456" },
      effect: "glass",
    });
    expect(style.backdropFilter).toBe("blur(24px) saturate(1.2)");
    expect(style.backgroundColor).toBe("color-mix(in srgb, #123456 36%, transparent)");
  });
});

/**
 * The Builder writes a Background config onto every Region draft it persists, so the field being there
 * says nothing about whether anybody set a ground. Switching a Header's glass off wrote a config that
 * paints nothing and locked the Region out of the Shell Chrome Overlay and out of its own Shell-record
 * colour.
 */
describe("background config paints a ground", () => {
  it("is false for nothing at all", () => {
    expect(phiBackgroundWidgetConfigPaintsGround(null)).toBe(false);
    expect(phiBackgroundWidgetConfigPaintsGround(undefined)).toBe(false);
  });

  it("is false for the empty config the Builder stores", () => {
    expect(phiBackgroundWidgetConfigPaintsGround({ base: { kind: "none" }, effect: null })).toBe(false);
  });

  it("is true for every Base that paints", () => {
    expect(phiBackgroundWidgetConfigPaintsGround({ base: { kind: "color", color: "#123456" } })).toBe(true);
    expect(
      phiBackgroundWidgetConfigPaintsGround({
        base: { kind: "image", sourceKind: "url", sourceUrl: "https://example.test/a.jpg" },
      }),
    ).toBe(true);
  });

  it("is true for an Overlay without a Base", () => {
    expect(
      phiBackgroundWidgetConfigPaintsGround({
        base: { kind: "none" },
        overlay: { kind: "noise", grain: "fine", opacity: 0.2 },
      }),
    ).toBe(true);
  });

  it("ignores the Effect, which a Region carries beside the Background", () => {
    expect(phiBackgroundWidgetConfigPaintsGround({ base: { kind: "none" }, effect: "glass" })).toBe(false);
  });
});

/**
 * A Pattern is a shape cut out of one paint, and that paint was hardcoded white: legible on a dark
 * ground, all but invisible on a light one. The ink is now part of the Overlay and may be a gradient,
 * which is why the layer is one SVG image rather than a stack of CSS gradients -- a CSS colour stop
 * takes a colour, and there is nowhere in it to put another gradient.
 */
describe("background pattern ink", () => {
  function patternSvg(overlay: Record<string, unknown>) {
    const image = String(
      resolvePhiBackgroundWidgetStyle({ base: { kind: "none" }, overlay }).backgroundImage ?? "",
    );
    const encoded = image.replace(/^url\("data:image\/svg\+xml,/, "").replace(/"\)$/, "");
    return decodeURIComponent(encoded);
  }

  const stripes = { kind: "pattern", patternKey: "@phis/background-patterns/stripes", values: {}, opacity: 0.5 };

  it("draws in white when no ink is set", () => {
    expect(patternSvg(stripes)).toContain('fill="#ffffff"');
  });

  it("draws in an authored colour", () => {
    expect(patternSvg({ ...stripes, ink: { kind: "color", color: "#101018" } })).toContain('fill="#101018"');
  });

  it("draws in an authored gradient", () => {
    const svg = patternSvg({
      ...stripes,
      ink: {
        kind: "gradient",
        direction: "to right",
        stops: [
          { color: "#ffd54f", percent: 0 },
          { color: "#4dd0e1", percent: 100 },
        ],
      },
    });
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('stop-color="#ffd54f"');
    expect(svg).toContain('stop-color="#4dd0e1"');
    expect(svg).toContain('fill="url(#phi-ink)"');
  });

  it("spans the painting area instead of tiling, so a gradient ink runs across it", () => {
    const style = resolvePhiBackgroundWidgetStyle({ base: { kind: "none" }, overlay: stripes });
    expect(style.backgroundSize).toBe("100% 100%");
    expect(style.backgroundRepeat).toBe("no-repeat");
  });

  it("keeps the ink through a normalize round trip", () => {
    const normalized = normalizePhiBackgroundWidgetConfig({
      base: { kind: "none" },
      overlay: { kind: "pattern", patternKey: "@phis/background-patterns/grid", values: {}, ink: { kind: "color", color: "#ff8800" } },
    });
    expect(normalized.overlay).toMatchObject({ kind: "pattern", ink: { kind: "color", color: "#ff8800" } });
  });

  it("reads a bare colour written before a gradient was possible", () => {
    const normalized = normalizePhiBackgroundWidgetConfig({
      base: { kind: "none" },
      overlay: { kind: "pattern", patternKey: "@phis/background-patterns/grid", values: {}, color: "#ff8800" },
    });
    expect(normalized.overlay).toMatchObject({ ink: { kind: "color", color: "#ff8800" } });
  });

  it("has no ink to keep on a noise overlay", () => {
    const normalized = normalizePhiBackgroundWidgetConfig({
      base: { kind: "none" },
      overlay: { kind: "noise", grain: "fine", ink: { kind: "color", color: "#ff8800" } },
    });
    expect(normalized.overlay).not.toHaveProperty("ink");
  });
});
