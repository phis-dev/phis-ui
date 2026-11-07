import { PhiCmsFlags } from "../../constants/phi-cms";
import { describe, expect, it } from "vitest";

import { PHI_SURFACE_TONE_GROUND } from "../../helpers/surface-style";
import { phiCmsRegionSiderSticks, resolvePhiCmsRegionShell, type PhiCmsRegionShellInput } from "./phi-cms-region-shell";

const shellTheme = {
  header: {
    light: { background: "#ffffff" },
    dark: { background: "#101820" },
  },
} as PhiCmsRegionShellInput["shellTheme"];

function resolve(input: Partial<PhiCmsRegionShellInput> & Pick<PhiCmsRegionShellInput, "regionKey">) {
  const shell = resolvePhiCmsRegionShell({ config: {}, paint: { kind: "published" }, ...input });
  if (shell == null) {
    throw new Error("expected a rendered Region");
  }
  return shell;
}

/**
 * A glass tint is a colour computed for one mode. Published, the renderer does not know the mode, so the
 * tint travels in the per-mode custom properties and the inline colour only points at the switched one;
 * holding the light tint inline kept it on in dark mode.
 */
describe("region shell glass", () => {
  it("publishes each mode's tint and paints the switched variable", () => {
    const shell = resolve({ regionKey: "header_main", config: { surface: { background: { base: { kind: "none" }, filter: "glass" } } }, shellTheme });
    const style = shell.style as Record<string, unknown>;

    expect(style.backgroundColor).toBe("var(--phi-region-background)");
    expect(style["--phi-region-background-light"]).toContain("#ffffff");
    expect(style["--phi-region-background-dark"]).toContain("#101820");
    expect(style.backdropFilter).toBeTruthy();
    expect(shell.attributes["data-phi-shell-chrome"]).toBeUndefined();
  });

  it("paints the live mode's tint inline and publishes no variables", () => {
    const shell = resolve({
      regionKey: "header_main",
      config: { surface: { background: { base: { kind: "none" }, filter: "glass" } } },
      shellTheme,
      paint: { kind: "live", mode: "dark" },
    });
    const style = shell.style as Record<string, unknown>;

    expect(style.backgroundColor).toContain("#101820");
    expect(style["--phi-region-background-dark"]).toBeUndefined();
  });
});

describe("region shell geometry", () => {
  it("honours a stated width on a non-Sider Region and fills the host otherwise", () => {
    expect(resolve({ regionKey: "content", config: { size: { width: 610 } } }).style.width).toBe("610px");
    expect(resolve({ regionKey: "content" }).style.width).toBe("100%");
  });

  it("centres a Region with a maximum width, but never a Sider", () => {
    expect(resolve({ regionKey: "content", config: { maxSize: { width: 610 } } }).style.marginInline)
      .toBe("auto");
    expect(resolve({ regionKey: "sider_left", config: { maxSize: { width: 610 } } }).style.marginInline)
      .toBeUndefined();
  });

  it("gives full height to a Sider only, with a minimum that holds", () => {
    const sider = resolve({ regionKey: "sider_left", config: { flags: PhiCmsFlags.FullHeight, offsetTop: 55 } });
    // A full-height Sider is a Shell column from the viewport's top: its own offset, no Header measured.
    expect(sider.style.height).toBe("calc(100dvh - 55px)");
    expect(sider.style.minHeight).toBe("calc(100dvh - 55px)");
    expect(sider.style.top).toBe(55);
    expect(sider.style.position).toBe("sticky");

    const header = resolve({ regionKey: "header_main", config: { flags: PhiCmsFlags.FullHeight } });
    expect(header.style.height).toBeUndefined();
  });

  it("takes its corners from a custom border, and states none otherwise", () => {
    const custom = resolve({
      regionKey: "content",
      config: { surface: { borderSource: "custom", border: { borderTopLeftRadius: 12 } } },
    });
    expect(custom.style.borderTopLeftRadius).toBe(12);
    expect(custom.style.borderRadius).toBeUndefined();
    expect(resolve({ regionKey: "content" }).style.borderTopLeftRadius).toBeUndefined();
  });
});

/**
 * A Region's `theme` edge is the separator: the Site's line on the side that faces the Page.
 */
describe("region shell edge", () => {
  it("draws the separator below a Header, above a Footer and inside a Sider", () => {
    const theme = { surface: { borderSource: "theme" as const } };
    expect(resolve({ regionKey: "header_main", config: theme }).style.borderBottom).toBeTruthy();
    expect(resolve({ regionKey: "footer_main", config: theme }).style.borderTop).toBeTruthy();
    expect(resolve({ regionKey: "sider_left", config: theme }).style.borderInlineEnd).toBeTruthy();
    expect(resolve({ regionKey: "sider_right", config: theme }).style.borderInlineStart).toBeTruthy();
    expect(resolve({ regionKey: "content", config: theme }).style.border).toBeTruthy();
  });

  it("draws nothing where nothing is configured", () => {
    const style = resolve({ regionKey: "header_main" }).style;
    expect(style.borderBottom).toBeUndefined();
    expect(style.border).toBeUndefined();
  });
});

describe("region shell chrome overlay", () => {
  it("is decided on both modes' grounds, so a ground authored for one mode opts out in both", () => {
    const darkOnly = { sider: { dark: { background: "#101820" } } } as PhiCmsRegionShellInput["shellTheme"];
    const published = resolve({ regionKey: "sider_left", shellTheme: darkOnly });
    const live = resolve({
      regionKey: "sider_left",
      shellTheme: darkOnly,
      paint: { kind: "live", mode: "light" },
    });

    expect(published.attributes["data-phi-shell-chrome"]).toBeUndefined();
    expect(live.attributes["data-phi-shell-chrome"]).toBeUndefined();
    expect(resolve({ regionKey: "sider_left" }).attributes["data-phi-shell-chrome"]).toBe("true");
  });

  it("renders nothing for a hidden Region", () => {
    expect(resolvePhiCmsRegionShell({
      regionKey: "content",
      config: { visibility: "hidden" },
      paint: { kind: "published" },
    })).toBeNull();
  });
});

/**
 * A tone turns the ground as well, by the rule every Surface follows (`phiSurfaceTakesToneGround`): a
 * Region in a mode of its own whose Background paints nothing takes the tone's container ground on the
 * element that carries the tone's class, and the Shell's ground no longer shows beneath it.
 */
describe("region shell tone ground", () => {
  const footerTheme = {
    footer: {
      light: { background: "linear-gradient(#ffffff, #eeeeee)" },
      dark: { background: "#101820" },
    },
  } as PhiCmsRegionShellInput["shellTheme"];

  it("paints the tone's ground on the toned element, published and live alike", () => {
    const published = resolve({ regionKey: "footer_main", config: { surface: { tone: "inverse" } }, shellTheme: footerTheme });
    const live = resolve({
      regionKey: "footer_main",
      config: { surface: { tone: "inverse" } },
      shellTheme: footerTheme,
      paint: { kind: "live", mode: "light" },
    });

    for (const shell of [published, live]) {
      expect(shell.style.backgroundColor).toBe(PHI_SURFACE_TONE_GROUND);
      expect(shell.style.backgroundImage).toBeUndefined();
      expect(shell.attributes.className.split(" ")).toContain("phi-tone-inverse");
      expect(shell.tone).toBe("inverse");
      expect(shell.attributes["data-phi-shell-chrome"]).toBeUndefined();
    }
    const style = published.style as Record<string, unknown>;
    expect(style["--phi-region-background-light"]).toBeUndefined();
    expect(style["--phi-region-background-dark"]).toBeUndefined();
  });

  it("counts an empty Background as no ground, and keeps the Shell from frosting beneath it", () => {
    const shell = resolve({
      regionKey: "header_main",
      config: { surface: { tone: "dark", background: { base: { kind: "none" }, filter: "glass" } } },
      shellTheme,
    });
    const style = shell.style as Record<string, unknown>;

    expect(style.backgroundColor).toBe(PHI_SURFACE_TONE_GROUND);
    expect(style["--phi-region-background-light"]).toBeUndefined();
    expect(style["--phi-region-background-dark"]).toBeUndefined();
  });

  it("takes the Chrome Overlay out of a Chrome Region", () => {
    expect(resolve({ regionKey: "sider_left", config: { surface: { tone: "light" } } }).attributes["data-phi-shell-chrome"])
      .toBeUndefined();
  });

  it("lets a stated ground win", () => {
    const shell = resolve({
      regionKey: "footer_main",
      config: { surface: { tone: "inverse", background: { base: { kind: "color", color: "#123456" } } } },
    });
    expect(shell.style.backgroundColor).not.toBe(PHI_SURFACE_TONE_GROUND);
    expect(shell.backgroundConfig).not.toBeNull();
  });

  it("leaves a Region without a tone as it was", () => {
    for (const tone of [undefined, "inherit"] as const) {
      const toned = resolve({ regionKey: "footer_main", config: { surface: { tone } }, shellTheme: footerTheme });
      const bare = resolve({ regionKey: "footer_main", shellTheme: footerTheme });
      expect(toned.style).toEqual(bare.style);
      expect(toned.style.backgroundColor).not.toBe(PHI_SURFACE_TONE_GROUND);
    }
    expect(resolve({ regionKey: "sider_left", config: { surface: { tone: "inherit" } } }).attributes["data-phi-shell-chrome"])
      .toBe("true");
  });
});

describe("a stuck Footer", () => {
  it("is footer_bottom, standing at the viewport's bottom with its offset", () => {
    const shell = resolve({ regionKey: "footer_bottom", config: { flags: PhiCmsFlags.Sticky, offsetBottom: 12 } });
    expect(shell.style.position).toBe("sticky");
    expect(shell.style.bottom).toBe("12px");
    expect(shell.style.top).toBeUndefined();
  });

  it("is no other Footer band: footer_top and footer_main scroll with the page", () => {
    for (const regionKey of ["footer_top", "footer_main"] as const) {
      const shell = resolve({ regionKey, config: { flags: PhiCmsFlags.Sticky, offsetBottom: 12 } });
      expect(shell.style.position).toBe("relative");
      expect(shell.style.bottom).toBeUndefined();
    }
  });

  it("stays in the flow without the flag", () => {
    const shell = resolve({ regionKey: "footer_bottom", config: { offsetBottom: 12 } });
    expect(shell.style.position).toBe("relative");
    expect(shell.style.bottom).toBeUndefined();
  });
});

describe("a stuck Sider", () => {
  it("stands under the Header's measured bottom, its offset added", () => {
    const shell = resolve({ regionKey: "sider_right", config: { flags: PhiCmsFlags.Sticky, offsetTop: 16 } });
    expect(shell.style.position).toBe("sticky");
    expect(shell.style.top).toBe("calc(var(--phi-shell-sticky-top, 0px) + 16px)");
  });

  it("is at most as tall as the viewport below that same line, and scrolls inside", () => {
    const shell = resolve({ regionKey: "sider_right", config: { flags: PhiCmsFlags.Sticky } });
    expect(shell.style.maxHeight).toBe("calc(100dvh - calc(var(--phi-shell-sticky-top, 0px) + 0px) - var(--phi-shell-sticky-bottom, 0px))");
    expect(shell.style.overflowY).toBe("auto");
    expect(shell.style.height).toBeUndefined();
  });

  it("is a full-height Sider's own column instead, from the viewport's top", () => {
    const shell = resolve({ regionKey: "sider_left", config: { flags: PhiCmsFlags.Sticky | PhiCmsFlags.FullHeight } });
    expect(shell.style.top).toBe(0);
    expect(shell.style.height).toBe("calc(100dvh - 0px)");
  });

  it("is asked for before the Region renders, only of a Sider, and only where it stands under the Header", () => {
    expect(phiCmsRegionSiderSticks("sider_right", { flags: PhiCmsFlags.Sticky })).toBe(true);
    expect(phiCmsRegionSiderSticks("sider_right", { flags: PhiCmsFlags.Sticky | PhiCmsFlags.FullHeight })).toBe(false);
    expect(phiCmsRegionSiderSticks("sider_right", { flags: PhiCmsFlags.FullHeight })).toBe(false);
    expect(phiCmsRegionSiderSticks("sider_right", {})).toBe(false);
    expect(phiCmsRegionSiderSticks("header_main", { flags: PhiCmsFlags.Sticky })).toBe(false);
  });
});

describe("region shell ground per mode and Hero overlap", () => {
  it("paints a Region's own ground per mode", () => {
    const shell = resolve({
      regionKey: "hero",
      config: { surface: { background: { base: { kind: "color", color: "#ffffff" } }, backgroundDark: { base: { kind: "color", color: "#000000" } } } },
    });
    expect(shell.style.backgroundColor).toBe("var(--phi-mode-light-gate, #000000) var(--phi-mode-dark-gate, #ffffff)");
  });

  it("publishes how far content reaches into the Hero, and only on content", () => {
    const content = resolve({ regionKey: "content", config: { heroOverlap: 120 } });
    expect((content.style as Record<string, unknown>)["--phi-region-hero-overlap"]).toBe("120px");
    const footer = resolve({ regionKey: "footer_main", config: { heroOverlap: 120 } });
    expect((footer.style as Record<string, unknown>)["--phi-region-hero-overlap"]).toBeUndefined();
  });
});

/* SHELL.md "The Sider on a phone": the mark `styles/shell.css` turns into a drawer, on `sider_left` alone. */
describe("region shell phone drawer", () => {
  it("marks a sider_left with MobileDrawer", () => {
    const shell = resolve({ regionKey: "sider_left", config: { flags: PhiCmsFlags.MobileDrawer } });
    expect(shell.attributes["data-phi-sider-mobile"]).toBe("drawer");
  });

  it("leaves sider_right and an unflagged sider_left in their column", () => {
    expect(resolve({ regionKey: "sider_right", config: { flags: PhiCmsFlags.MobileDrawer } }).attributes["data-phi-sider-mobile"]).toBeUndefined();
    expect(resolve({ regionKey: "sider_left", config: { flags: PhiCmsFlags.Sticky } }).attributes["data-phi-sider-mobile"]).toBeUndefined();
  });
});
