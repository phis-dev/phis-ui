import { describe, expect, it } from "vitest";

import { resolvePhiCmsRegionShell, type PhiCmsRegionShellInput } from "./phi-cms-region-shell";

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
    const sider = resolve({ regionKey: "sider_left", config: { fullHeight: true, offsetTop: 55 } });
    expect(sider.style.height).toBe("calc(100dvh - 55px)");
    expect(sider.style.minHeight).toBe("calc(100dvh - 55px)");
    expect(sider.style.position).toBe("sticky");

    const header = resolve({ regionKey: "header_main", config: { fullHeight: true } });
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
