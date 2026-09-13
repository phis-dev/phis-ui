import { describe, expect, it } from "vitest";

import {
  adoptPhiThemeModuleBlocks,
  adoptPhiThemeModuleGround,
  adoptPhiThemeModulePalette,
  adoptPhiThemeModuleStyle,
  isPhiCoreThemeGround,
} from "./phi-theme-adoption";
import { PHI_CORE_THEME_GROUND_BLOCKS, PHI_CORE_THEME_STYLE_BLOCKS, type PhiThemeGroundBlock, type PhiThemeStyleBlock } from "./phi-theme-blocks";
import { resolvePhiThemeEffectiveRoot } from "./phi-theme-composition";
import { PHI_CORE_THEME_PRESET_PLUGINS, resolvePhiThemeColorTokens, type PhiThemePresetPlugin } from "./phi-theme-presets";
import type { PhiSiteThemeRoot } from "../types/site-theme";
import { createPhiControlShapeCorners, type PhiControlShapeCorners } from "./phi-control-shape";

/** The slice of a Site Theme the adoption reads and writes. */
type Theme = {
  blocks?: { ground?: { key: string } };
  root: PhiSiteThemeRoot | null;
  palette?: PhiThemePresetPlugin["palette"] | null;
  style?: { token?: Record<string, unknown> } | null;
  shape?: { controls?: PhiControlShapeCorners | null } | null;
};

const phiPalette = PHI_CORE_THEME_PRESET_PLUGINS[0];
const phiStyle = PHI_CORE_THEME_STYLE_BLOCKS[0];

/** A palette the way a Module ships one: shared seeds, and the two base seeds per mode. */
const modulePalette: PhiThemePresetPlugin = {
  key: "@acme/ui/palettes/dunes",
  version: 1,
  title: "Dunes",
  // Complete, like every shipped palette should be: a key a palette leaves out shows through from the
  // block the selection falls back to once the Module is gone, which is the one thing a copy cannot fix.
  palette: {
    seed: {
      colorPrimary: "#B5651D",
      colorInfo: "#7A5C3A",
      colorSuccess: "#5C7A3A",
      colorWarning: "#C9902A",
      colorError: "#B0402A",
      colorLink: "#B5651D",
    },
    modes: {
      light: { seed: { colorTextBase: "#2B1D0E", colorBgBase: "#FFF8EE" } },
      dark: { seed: { colorTextBase: "#F3E9DA", colorBgBase: "#1A120A" }, overrides: { colorBgLayout: "#120C06" } },
    },
  },
};

const moduleStyle: PhiThemeStyleBlock = {
  key: "@acme/ui/styles/brutal",
  version: 1,
  title: "Brutal",
  style: { token: { borderRadius: 0, controlHeight: 28 } },
  shape: { controls: createPhiControlShapeCorners("square") },
};

const plain = PHI_CORE_THEME_GROUND_BLOCKS.find((block) => block.key === "plain")!;
const phi = PHI_CORE_THEME_GROUND_BLOCKS.find((block) => block.key === "phi")!;

/** A ground the way a Module ships one: a picture per mode under a frosted, tinted frame. */
const moduleGround: PhiThemeGroundBlock = {
  key: "@acme/ui/grounds/dunes",
  version: 1,
  title: "Dunes",
  root: {
    background: {
      light: { base: { kind: "image", sourceKind: "url", sourceUrl: "data:image/svg+xml;base64,bGlnaHQ=" }, overlay: null, effect: null, motion: null },
      dark: { base: { kind: "image", sourceKind: "url", sourceUrl: "data:image/svg+xml;base64,ZGFyaw==" }, overlay: null, effect: "dim", motion: null },
    },
    chrome: {
      light: { base: { kind: "color", color: "rgba(255,255,255,0.6)" }, overlay: null, effect: "glass", motion: null },
      dark: { base: { kind: "color", color: "rgba(0,0,0,0.6)" }, overlay: null, effect: "glass", motion: null },
      shadow: { header: "soft", sider: "soft", footer: "soft" },
    },
  },
};

/**
 * A saved Theme that resolves to a Module's ground must not depend on that Module afterwards -- and
 * must not come apart halfway, picture kept and frame gone, when the Module is switched off.
 */
describe("adopting a Module ground on save", () => {
  it("leaves a Theme on a core ground alone", () => {
    expect(isPhiCoreThemeGround(phi)).toBe(true);
    const theme: Theme = { blocks: { ground: { key: "phi" } }, root: null };
    expect(adoptPhiThemeModuleGround(theme, phi)).toBe(theme);
  });

  it("copies the whole effective ground into the record", () => {
    expect(isPhiCoreThemeGround(moduleGround)).toBe(false);
    const theme: Theme = { blocks: { ground: { key: moduleGround.key } }, root: null };
    const adopted = adoptPhiThemeModuleGround(theme, moduleGround);
    expect(adopted.root?.background?.light?.base.kind).toBe("image");
    expect(adopted.root?.background?.dark?.effect).toBe("dim");
    expect(adopted.root?.chrome?.light?.effect).toBe("glass");
    expect(adopted.root?.chrome?.dark?.base).toEqual({ kind: "color", color: "rgba(0,0,0,0.6)" });
    expect(adopted.root?.chrome?.shadow).toEqual({ header: "soft", sider: "soft", footer: "soft" });
    // The key stays as provenance; only the values moved.
    expect(adopted.blocks?.ground?.key).toBe(moduleGround.key);
  });

  it("keeps what the author already set and fills only the rest", () => {
    const authoredLight = { base: { kind: "color" as const, color: "#ff0000" }, overlay: null, effect: null, motion: null };
    const theme: Theme = { root: { background: { light: authoredLight } } };
    const adopted = adoptPhiThemeModuleGround(theme, moduleGround);
    expect(adopted.root?.background?.light).toEqual(authoredLight);
    expect(adopted.root?.background?.dark?.base.kind).toBe("image");
  });

  it("renders the same once the Module is gone", () => {
    const theme: Theme = { root: null };
    const adopted = adoptPhiThemeModuleGround(theme, moduleGround);
    // After the Module is switched off the selection resolves to the core floor -- and nothing changes.
    const withModule = resolvePhiThemeEffectiveRoot(adopted.root, moduleGround);
    const withoutModule = resolvePhiThemeEffectiveRoot(adopted.root, plain);
    expect(withoutModule.background).toEqual(withModule.background);
    expect(withoutModule.chrome).toEqual(withModule.chrome);
  });
});

describe("adopting a Module palette and style on save", () => {
  it("leaves core blocks followed", () => {
    const theme: Theme = { root: null };
    expect(adoptPhiThemeModulePalette(theme, phiPalette)).toBe(theme);
    expect(adoptPhiThemeModuleStyle(theme, phiStyle)).toBe(theme);
  });

  it("copies the palette in the shape the Module shipped it, per mode", () => {
    const adopted = adoptPhiThemeModulePalette({ root: null } as Theme, modulePalette);
    expect(adopted.palette).toEqual(modulePalette.palette);
  });

  it("keeps the author's colours over the Module's", () => {
    const theme: Theme = { root: null, palette: { seed: { colorPrimary: "#000000" } } };
    const adopted = adoptPhiThemeModulePalette(theme, modulePalette);
    expect(adopted.palette?.seed?.colorPrimary).toBe("#000000");
    expect(adopted.palette?.seed?.colorLink).toBe("#B5651D");
    expect(adopted.palette?.modes?.dark?.overrides).toEqual({ colorBgLayout: "#120C06" });
  });

  it("resolves the same colours once the Module palette is gone", () => {
    const adopted = adoptPhiThemeModulePalette({ root: null } as Theme, modulePalette);
    for (const mode of ["light", "dark"] as const) {
      // The selection falls back to the core palette; the Site's own palette lies over it and wins.
      expect(resolvePhiThemeColorTokens(phiPalette, adopted.palette, mode))
        .toEqual(resolvePhiThemeColorTokens(modulePalette, null, mode));
    }
  });

  it("puts the Module's style under the author's tokens", () => {
    const adopted = adoptPhiThemeModuleStyle({ root: null, style: { token: { controlHeight: 40 } } } as Theme, moduleStyle);
    expect(adopted.style?.token).toEqual({ borderRadius: 0, controlHeight: 40 });
  });

  it("takes the Module's Control shape only where the author picked none", () => {
    expect(adoptPhiThemeModuleStyle({ root: null } as Theme, moduleStyle).shape?.controls)
      .toEqual(createPhiControlShapeCorners("square"));
    const pill = createPhiControlShapeCorners("pill");
    expect(adoptPhiThemeModuleStyle({ root: null, shape: { controls: pill } } as Theme, moduleStyle).shape?.controls)
      .toEqual(pill);
  });

  it("takes every Module block over at once", () => {
    const adopted = adoptPhiThemeModuleBlocks({ root: null } as Theme, {
      palette: modulePalette,
      style: moduleStyle,
      ground: moduleGround,
    });
    expect(adopted.palette).toEqual(modulePalette.palette);
    expect(adopted.style?.token).toEqual(moduleStyle.style.token);
    expect(adopted.root?.chrome?.light?.effect).toBe("glass");
  });
});
