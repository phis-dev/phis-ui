import { describe, expect, it } from "vitest";

import { resolvePhiRootTheme } from "../components/root/phi-root-theme-resolver";
import { PHI_CORE_THEME_BLOCK_CATALOG, resolvePhiThemeEffectiveRoot } from "./phi-theme-composition";
import {
  buildPhiThemeInverseGroundTokens,
  isPhiOpaqueCssColor,
  readPhiThemeInverseGround,
  resolvePhiThemeInverseGround,
} from "./phi-theme-inverse-ground";
import { PHI_CORE_THEME_PRESET_PLUGINS } from "./phi-theme-presets";
import { PHI_THEME_OWN_TOKEN_KEYS } from "./phi-theme-tokens";

describe("an opaque CSS colour", () => {
  it.each([
    "#123",
    "#123f",
    "#102030",
    "#102030ff",
    "#102030FF",
    "rgb(16, 32, 48)",
    "rgba(16, 32, 48, 1)",
    "rgb(16 32 48)",
    "rgb(16 32 48 / 100%)",
    "hsl(210 50% 13%)",
    "hsla(210, 50%, 13%, 1.0)",
    "oklch(0.2 0.03 250)",
    " #102030 ",
  ])("accepts %s", (color) => {
    expect(isPhiOpaqueCssColor(color)).toBe(true);
  });

  it.each([
    "#1238",
    "#10203080",
    "rgba(9, 14, 26, 0.55)",
    "rgb(9 14 26 / 55%)",
    "hsla(210, 50%, 13%, .5)",
    "transparent",
    "navy",
    "var(--phi-color-bg-container)",
    "rgb(9 14 26 / var(--alpha))",
    "",
  ])("refuses %s", (color) => {
    expect(isPhiOpaqueCssColor(color)).toBe(false);
  });
});

describe("the stored Inverse Ground", () => {
  it("is none where nothing is stored", () => {
    expect(readPhiThemeInverseGround(undefined)).toBeNull();
    expect(readPhiThemeInverseGround(null)).toBeNull();
  });

  it("reads one opaque colour per mode, either mode alone", () => {
    expect(readPhiThemeInverseGround({ light: "#f5f5f5", dark: "rgb(16, 24, 32)" }))
      .toEqual({ light: "#f5f5f5", dark: "rgb(16, 24, 32)" });
    expect(readPhiThemeInverseGround({ dark: "#101820", light: null })).toEqual({ dark: "#101820" });
    expect(readPhiThemeInverseGround({})).toEqual({});
  });

  it("refuses a wrong shape instead of dropping it", () => {
    expect(() => readPhiThemeInverseGround("#101820")).toThrow(/per mode/u);
    expect(() => readPhiThemeInverseGround(["#101820"])).toThrow(/per mode/u);
    expect(() => readPhiThemeInverseGround({ dark: "#101820", system: "#000" })).toThrow(/unknown modes: system/u);
    expect(() => readPhiThemeInverseGround({ dark: 0x101820 })).toThrow(/dark colour/u);
  });

  it("refuses a colour that lets the page show through", () => {
    expect(() => readPhiThemeInverseGround({ dark: "rgba(9, 14, 26, 0.55)" })).toThrow(/opaque/u);
    expect(() => readPhiThemeInverseGround({ light: "transparent" })).toThrow(/opaque/u);
  });
});

describe("the ground an inverse box stands on", () => {
  const token = { colorBgContainer: "#141414" };

  it("is the mode's container ground where the Theme states none", () => {
    expect(resolvePhiThemeInverseGround(null, "dark", token)).toBe("#141414");
    expect(resolvePhiThemeInverseGround({ light: "#fafafa" }, "dark", token)).toBe("#141414");
  });

  it("is the Theme's stated colour for its mode", () => {
    expect(resolvePhiThemeInverseGround({ dark: "#101820" }, "dark", token)).toBe("#101820");
    expect(buildPhiThemeInverseGroundTokens({ dark: "#101820" }, "dark", token)).toEqual({ inverseGround: "#101820" });
  });

  it("needs the mode's resolved container ground to derive from", () => {
    expect(() => resolvePhiThemeInverseGround(null, "light", {})).toThrow(/colorBgContainer/u);
  });

  it("is a token of the package's own", () => {
    expect(PHI_THEME_OWN_TOKEN_KEYS).toContain("inverseGround");
  });

  it("rides on every resolved mode, derived from that mode's own colours", () => {
    const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };
    const resolve = (siteTheme: object, mode: "light" | "dark") => resolvePhiRootTheme({
      siteTheme: { preset: "phis", shape: { controls: corners }, ...siteTheme } as never,
      mode,
      fonts: {},
      presets: PHI_CORE_THEME_PRESET_PLUGINS,
    }).theme.token;
    for (const mode of ["light", "dark"] as const) {
      const token = resolve({}, mode);
      expect(token.inverseGround).toBe(token.colorBgContainer);
    }
    expect(resolve({}, "light").inverseGround).not.toBe(resolve({}, "dark").inverseGround);
    const stated = { root: { inverse: { dark: "#101820" } } };
    expect(resolve(stated, "dark").inverseGround).toBe("#101820");
    expect(resolve(stated, "light").inverseGround).toBe(resolve({}, "light").colorBgContainer);
  });
});

describe("the effective Inverse Ground", () => {
  const ground = PHI_CORE_THEME_BLOCK_CATALOG.grounds[0]!;
  const withInverse = { ...ground, root: { ...ground.root, inverse: { light: "#eeeeee", dark: "#111111" } } };

  it("states nothing where neither the author nor the block does", () => {
    expect(resolvePhiThemeEffectiveRoot(null, ground).inverse).toEqual({ light: null, dark: null });
  });

  it("merges per mode: the author's mode wins, the block's other mode stays", () => {
    expect(resolvePhiThemeEffectiveRoot({ inverse: { dark: "#101820" } }, withInverse).inverse)
      .toEqual({ light: "#eeeeee", dark: "#101820" });
  });

  it("refuses a stored ground of the wrong shape", () => {
    expect(() => resolvePhiThemeEffectiveRoot({ inverse: { dark: "rgba(0, 0, 0, 0.5)" } }, ground)).toThrow(/opaque/u);
  });
});
