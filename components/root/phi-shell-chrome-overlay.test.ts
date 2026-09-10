import { describe, expect, it } from "vitest";

import {
  phiRegionUsesShellChromeOverlay,
  resolvePhiShellChromeOverlayStyle,
  resolvePhiShellChromeOverlayVariables,
  resolvePhiShellChromePaneStickyTop,
} from "./phi-shell-chrome-overlay";

/**
 * The overlay travels as custom properties because the Regions that paint it are rendered far below the
 * Theme provider. Both modes are published at once and the switch stays in CSS, so a mode with nothing
 * configured has to publish nothing rather than an empty value that would win over the Region's ground.
 */
describe("shell chrome overlay variables", () => {
  it("publishes nothing when no overlay is configured", () => {
    expect(resolvePhiShellChromeOverlayVariables(null)).toEqual({});
    expect(resolvePhiShellChromeOverlayVariables({ background: { light: { base: { kind: "color", color: "#fff" } } } })).toEqual({});
  });

  it("publishes only the mode that is configured", () => {
    const variables = resolvePhiShellChromeOverlayVariables({
      chrome: { light: { base: { kind: "color" as const, color: "#ffffff80" } } },
    });
    expect(variables["--phi-shell-chrome-color-light"]).toBe("#ffffff80");
    expect(variables["--phi-shell-chrome-color-dark"]).toBeUndefined();
  });

  it("publishes both modes independently", () => {
    const variables = resolvePhiShellChromeOverlayVariables({
      chrome: {
        light: { base: { kind: "color" as const, color: "#ffffff80" } },
        dark: { base: { kind: "color" as const, color: "#00000080" } },
      },
    });
    expect(variables["--phi-shell-chrome-color-light"]).toBe("#ffffff80");
    expect(variables["--phi-shell-chrome-color-dark"]).toBe("#00000080");
  });

  it("publishes the picture a gradient and a Pattern paint", () => {
    const variables = resolvePhiShellChromeOverlayVariables({
      chrome: {
        light: {
          base: {
            kind: "gradient" as const,
            direction: "to bottom" as const,
            stops: [
              { color: "#ffffff", percent: 0 },
              { color: "#e0e0ff", percent: 100 },
            ],
          },
          overlay: { kind: "noise" as const, grain: "fine" as const, opacity: 0.2 },
        },
      },
    });
    expect(variables["--phi-shell-chrome-image-light"]).toContain(
      "linear-gradient(to bottom, #ffffff 0%, #e0e0ff 100%)",
    );
    expect(variables["--phi-shell-chrome-size-light"]).toBeTruthy();
    expect(variables["--phi-shell-chrome-repeat-light"]).toBeTruthy();
  });
});

/**
 * The overlay is the Chrome's own ground, not a pane above it, so an Effect here lands on the Region
 * itself. Only `glass` acts on what is behind the Region; the rest would take the Header's own content
 * with them and are resolved away without rewriting what is stored.
 */
describe("shell chrome overlay effects", () => {
  it("frosts what is behind the Chrome under glass", () => {
    const style = resolvePhiShellChromeOverlayStyle({ chrome: { light: { base: { kind: "none" as const }, effect: "glass" as const } } }, "light");
    expect(style?.backdropFilter).toBeTruthy();
    expect(String(style?.backgroundColor)).toContain("color-mix");
  });

  it("resolves an Effect it does not offer away", () => {
    for (const effect of ["blur", "dim", "tint"] as const) {
      const style = resolvePhiShellChromeOverlayStyle(
        { chrome: { light: { base: { kind: "color" as const, color: "#123456" }, effect } } },
        "light",
      );
      expect(style?.filter).toBeUndefined();
      expect(style?.boxShadow).toBeUndefined();
      expect(style?.backgroundColor).toBe("#123456");
    }
  });

  it("has no style at all for an unconfigured mode", () => {
    expect(
      resolvePhiShellChromeOverlayStyle({ chrome: { light: { base: { kind: "none" as const } } } }, "dark"),
    ).toBeNull();
  });
});

/**
 * The overlay is a treatment laid over the Theme Root Background, not a second ground. An image Base
 * would be a picture cut against the picture behind the Content along the frame edge, and it would hide
 * the Root Background exactly where the frame is, so it is neither offered nor honoured.
 */
describe("shell chrome overlay base", () => {
  it("paints nothing for an image base and keeps the rest of the record", () => {
    const style = resolvePhiShellChromeOverlayStyle(
      {
        chrome: {
          light: {
            base: {
              kind: "image" as const,
              sourceKind: "url" as const,
              sourceUrl: "https://example.test/frame.jpg",
            },
            effect: "glass" as const,
          },
        },
      },
      "light",
    );
    expect(style?.backgroundImage).toBeUndefined();
    expect(style?.backdropFilter).toBeTruthy();
  });

  it("keeps a gradient and its Pattern, which are treatments rather than pictures", () => {
    const variables = resolvePhiShellChromeOverlayVariables({
      chrome: {
        light: {
          base: {
            kind: "gradient" as const,
            direction: "135deg" as const,
            stops: [
              { color: "rgba(0,0,0,0.4)", percent: 0 },
              { color: "rgba(0,0,0,0)", percent: 100 },
            ],
          },
        },
      },
    });
    expect(variables["--phi-shell-chrome-image-light"]).toContain("linear-gradient(135deg");
  });
});

/**
 * A Region that authored its own chrome paints over the Theme. Every carrier counts: reading only the
 * structured config let the Builder's Sider take the Site's overlay on top of the container ground it
 * paints on purpose, while its Headers stayed out because they carry an Effect.
 */
describe("shell chrome overlay participation", () => {
  const chromeRegion = { regionKey: "sider_left", grounds: [] as readonly (string | null)[] };

  it("takes an unauthored Chrome Region", () => {
    expect(phiRegionUsesShellChromeOverlay({ ...chromeRegion, grounds: [null, undefined] })).toBe(true);
  });

  it("leaves Content, Hero and Drawers out", () => {
    for (const regionKey of ["content", "hero", "drawer_left", "drawer_right"]) {
      expect(phiRegionUsesShellChromeOverlay({ regionKey, grounds: [] })).toBe(false);
    }
  });

  it("stays out of a Region that authored a ground as a plain colour", () => {
    expect(
      phiRegionUsesShellChromeOverlay({ ...chromeRegion, grounds: ["var(--ant-color-bg-container)"] }),
    ).toBe(false);
  });

  it("stays out of a Region that authored a structured Background", () => {
    expect(
      phiRegionUsesShellChromeOverlay({
        ...chromeRegion,
        backgroundConfig: { base: { kind: "color", color: "#123456" } },
        grounds: [null],
      }),
    ).toBe(false);
  });

  it("stays out of a Region that authored an Effect", () => {
    expect(
      phiRegionUsesShellChromeOverlay({ regionKey: "header_main", effect: "glass", grounds: [null] }),
    ).toBe(false);
  });
});

describe("resolvePhiShellChromePaneStickyTop", () => {
  it("sticks at zero when every band sticks there", () => {
    expect(resolvePhiShellChromePaneStickyTop([
      { sticky: true, offsetTop: 0, height: "55px" },
      { sticky: true, offsetTop: 0, height: "55px" },
    ])).toBe("0px");
  });

  /*
   * The Builder's own Header: a 55px band that does not stick, above bands that do. The pane travels
   * the height of what scrolls away and stands still after that, as one element rather than two.
   */
  it("travels the height of the bands above the first sticky one", () => {
    expect(resolvePhiShellChromePaneStickyTop([
      { sticky: false, offsetTop: 0, height: "55px" },
      { sticky: true, offsetTop: 0, height: "55px" },
      { sticky: true, offsetTop: 55, height: "55px" },
    ])).toBe("-55px");
  });

  it("counts an absent band as no travel at all", () => {
    expect(resolvePhiShellChromePaneStickyTop([
      null,
      { sticky: true, offsetTop: 0, height: "55px" },
    ])).toBe("0px");
  });

  it("adds the first sticky band's own offset", () => {
    expect(resolvePhiShellChromePaneStickyTop([
      { sticky: false, height: 40 },
      { sticky: true, offsetTop: 10, height: "55px" },
    ])).toBe("-30px");
  });

  it("does not stick when no band does", () => {
    expect(resolvePhiShellChromePaneStickyTop([
      { sticky: false, height: "55px" },
      { height: "55px" },
    ])).toBeNull();
  });

  /*
   * An `auto` height above the first sticky band leaves the travel unknown. Not sticking is wrong only
   * while scrolling; sticking at a guessed offset is wrong at rest too.
   */
  it("does not stick when a band above the first sticky one has no pixel height", () => {
    expect(resolvePhiShellChromePaneStickyTop([
      { sticky: false, height: "auto" },
      { sticky: true, offsetTop: 0, height: "55px" },
    ])).toBeNull();
  });
});
