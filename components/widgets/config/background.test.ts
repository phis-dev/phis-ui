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

  it("withholds both glass strengths from a base with nothing to thin", () => {
    for (const effect of ["glass", "haze"] as const) {
      expect(resolvePhiBackgroundEffect({ base: image, effect })).toBeNull();
      expect(
        resolvePhiBackgroundEffect({
          base: { kind: "gradient", direction: "to top", stops: [] },
          effect,
        }),
      ).toBeNull();
    }
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

/**
 * The wash: the same ink a Pattern uses, with nothing masked out of it. It is what darkens a picture
 * enough to carry text, which `dim` cannot do -- a filter takes the content rendered inside the
 * element with it, a layer only covers the paint.
 */
describe("background colour overlay", () => {
  function overlaySvg(overlay: Record<string, unknown>) {
    const image = String(
      resolvePhiBackgroundWidgetStyle({ base: { kind: "none" }, overlay }).backgroundImage ?? "",
    );
    const encoded = image.replace(/^url\("data:image\/svg\+xml,/, "").replace(/"\)$/, "");
    return decodeURIComponent(encoded);
  }

  it("washes in black when no ink is set, because a wash is reached for to darken", () => {
    const svg = overlaySvg({ kind: "color", opacity: 0.5 });
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('opacity="0.5"');
    expect(svg).not.toContain("mask=");
  });

  it("washes in an authored colour", () => {
    expect(overlaySvg({ kind: "color", ink: { kind: "color", color: "#101018" } })).toContain(
      'fill="#101018"',
    );
  });

  it("fades rather than covers when the ink is a gradient", () => {
    const svg = overlaySvg({
      kind: "color",
      ink: {
        kind: "gradient",
        direction: "to top",
        stops: [
          { color: "rgba(0, 0, 0, 0.8)", percent: 0 },
          { color: "rgba(0, 0, 0, 0)", percent: 100 },
        ],
      },
    });
    expect(svg).toContain("<linearGradient");
    expect(svg).toContain('fill="url(#phi-ink)"');
  });

  it("covers the painting area once, over the Base image", () => {
    const style = resolvePhiBackgroundWidgetStyle({
      base: { kind: "image", sourceKind: "url", sourceUrl: "https://example.test/ground.jpg" },
      overlay: { kind: "color", opacity: 0.4 },
    });
    const images = String(style.backgroundImage ?? "").split(", ");
    expect(images).toHaveLength(2);
    expect(images[0]).toContain("data:image/svg+xml");
    expect(images[1]).toContain("https://example.test/ground.jpg");
    expect(style.backgroundSize).toBe("100% 100%, cover");
    expect(style.backgroundRepeat).toBe("no-repeat, no-repeat");
  });

  it("keeps the ink through a normalize round trip, and reads a bare colour", () => {
    expect(
      normalizePhiBackgroundWidgetConfig({
        base: { kind: "none" },
        overlay: { kind: "color", ink: { kind: "color", color: "#ff8800" } },
      }).overlay,
    ).toMatchObject({ kind: "color", ink: { kind: "color", color: "#ff8800" } });

    expect(
      normalizePhiBackgroundWidgetConfig({
        base: { kind: "none" },
        overlay: { kind: "color", color: "#ff8800" },
      }).overlay,
    ).toMatchObject({ kind: "color", ink: { kind: "color", color: "#ff8800" } });
  });

  it("paints a ground on its own, the way every other Overlay does", () => {
    expect(
      phiBackgroundWidgetConfigPaintsGround({ base: { kind: "none" }, overlay: { kind: "color" } }),
    ).toBe(true);
  });
});

/**
 * `tint` was a fixed inset Shadow in one Theme colour at one strength, with no way to choose either.
 * The colour Overlay is what it was reaching for, so the Effect is gone rather than doubled.
 */
describe("retired tint effect", () => {
  it("resolves away instead of painting", () => {
    const style = resolvePhiBackgroundWidgetStyle({
      base: { kind: "color", color: "#101018" },
      effect: "tint",
    });
    expect(style.boxShadow).toBeUndefined();
    expect(style.backgroundColor).toBe("#101018");
  });

  it("normalizes to no Effect at all", () => {
    expect(
      normalizePhiBackgroundWidgetConfig({ base: { kind: "none" }, effect: "tint" }).effect,
    ).toBeNull();
  });
});
