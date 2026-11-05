import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  PHI_BACKGROUND_BASE_KINDS,
  PHI_BACKGROUND_THEME_STYLE,
  normalizePhiBackgroundWidgetConfig,
  phiBackgroundWidgetConfigPaintsGround,
  resolvePhiBackgroundFilter,
  resolvePhiBackgroundWidgetStyle,
} from "../components/widgets/config/background";
import { resolvePhiCmsRegionShell, type PhiCmsRegionShellInput } from "../components/regions/phi-cms-region-shell";
import { resolvePhiRootBackgroundPaintStyle } from "../components/root/phi-root-background";
import { resolvePhiShellChromeOverlayConfig } from "../components/root/phi-shell-chrome-overlay";
import { readPhiSurface } from "../types/surface";
import { PHI_SURFACE_TONE_GROUND, resolvePhiSurfaceStyle } from "./surface-style";

const theme = { base: { kind: "theme" as const } };
const themeColour = "var(--phi-shell-chrome-color, var(--ant-color-bg-container))";

describe("a Background that is the Theme's", () => {
  it("is a Base kind of its own, offered by default, and reads back as itself", () => {
    expect(PHI_BACKGROUND_BASE_KINDS).toContain("theme");
    expect(normalizePhiBackgroundWidgetConfig(theme)).toEqual({
      base: { kind: "theme" },
      overlay: null,
      filter: null,
      motion: null,
    });
  });

  it("is the Overlay whole: an Overlay, a Filter or a motion stored beside it resolves away", () => {
    const stored = {
      base: { kind: "theme" },
      overlay: { kind: "noise", grain: "fine" },
      filter: "glass",
      motion: { mode: "fixed" },
    };
    expect(normalizePhiBackgroundWidgetConfig(stored)).toEqual(normalizePhiBackgroundWidgetConfig(theme));
    expect(resolvePhiBackgroundFilter(stored)).toBeNull();
  });

  it("paints the Shell Chrome Overlay's variables, and counts as a stated ground", () => {
    expect(resolvePhiBackgroundWidgetStyle(theme)).toEqual(PHI_BACKGROUND_THEME_STYLE);
    expect(PHI_BACKGROUND_THEME_STYLE.backgroundColor).toBe(themeColour);
    expect(PHI_BACKGROUND_THEME_STYLE.backdropFilter).toBe("var(--phi-shell-chrome-filter, none)");
    expect(phiBackgroundWidgetConfigPaintsGround(theme)).toBe(true);
  });

  it("is neither offered nor honoured by the Root Background or the Chrome Overlay itself", () => {
    expect(resolvePhiRootBackgroundPaintStyle({ background: { light: theme } }, "light")).toEqual({});
    expect(resolvePhiShellChromeOverlayConfig(theme).base).toEqual({ kind: "none" });
  });
});

describe("a Surface with the Theme's ground", () => {
  it("without a tone paints the Overlay of the page's mode and no tone ground", () => {
    const resolved = resolvePhiSurfaceStyle(readPhiSurface({ background: theme }));
    expect(resolved.style.backgroundColor).toBe(themeColour);
    expect(resolved.style.backgroundAttachment).toBe("fixed");
    expect(resolved.className).toBeUndefined();
    expect(resolved.paintsGround).toBe(true);
  });

  it.each(["light", "dark", "inverse"] as const)(
    "with the %s tone carries the tone's class and paints the Overlay, never the tone's own ground",
    (tone) => {
      const resolved = resolvePhiSurfaceStyle(readPhiSurface({ background: theme, tone }));
      expect(resolved.className).toBe(`phi-tone-${tone}`);
      expect(resolved.style.backgroundColor).toBe(themeColour);
      expect(resolved.style.backgroundColor).not.toBe(PHI_SURFACE_TONE_GROUND);
      expect(resolved.style.backdropFilter).toBe("var(--phi-shell-chrome-filter, none)");
    },
  );

  it("lets a stated colour win over the tone's ground as before", () => {
    const resolved = resolvePhiSurfaceStyle(readPhiSurface({
      background: { base: { kind: "color", color: "#123456" } },
      tone: "inverse",
    }));
    expect(resolved.style.backgroundColor).toBe("#123456");
  });

  it("stays on the box even where a layer is asked for, so its pane frosts the page", () => {
    const resolved = resolvePhiSurfaceStyle(readPhiSurface({ background: theme, tone: "dark" }), { forceGroundLayer: true });
    expect(resolved.ground).toBeNull();
    expect(resolved.style.backgroundColor).toBe(themeColour);
  });
});

/*
 * The tone picks the mode in CSS: its class publishes that mode's Overlay variables, inside the Root
 * Layout only, and `inverse` reads the page's mode. The rule bodies are read off the stylesheet.
 */
describe("the Overlay in a tone's mode", () => {
  const css = readFileSync(fileURLToPath(new URL("../styles/shell.css", import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "");
  const ruleFor = (selector: string) => {
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/gu)];
    const found = rules.find(([, selectors]) =>
      selectors.split(",").map((entry) => entry.trim()).includes(selector));
    return found?.[2] ?? null;
  };

  it.each([
    [":where([data-phi-root-layout=\"true\"]) :where(.phi-tone-light)", "light"],
    [":where([data-phi-root-layout=\"true\"]) :where(.phi-tone-dark)", "dark"],
    [":where([data-phi-root-layout=\"true\"]:not([data-phi-theme-mode=\"dark\"])) :where(.phi-tone-inverse)", "dark"],
    [":where([data-phi-root-layout=\"true\"][data-phi-theme-mode=\"dark\"]) :where(.phi-tone-inverse)", "light"],
  ])("%s publishes the %s Overlay", (selector, mode) => {
    const body = ruleFor(selector);
    expect(body).not.toBeNull();
    for (const name of ["image", "size", "position", "repeat", "color", "filter"]) {
      expect(body).toContain(`--phi-shell-chrome-${name}: var(--phi-shell-chrome-${name}-${mode},`);
    }
  });
});

const shellTheme = {
  header: { light: { background: "#ffffff" }, dark: { background: "#101820" } },
  footer: { light: { background: "#eeeeee" }, dark: { background: "#202020" } },
} as PhiCmsRegionShellInput["shellTheme"];

function resolveRegion(input: Partial<PhiCmsRegionShellInput> & Pick<PhiCmsRegionShellInput, "regionKey">) {
  const shell = resolvePhiCmsRegionShell({ config: {}, paint: { kind: "published" }, shellTheme, ...input });
  if (shell == null) {
    throw new Error("expected a rendered Region");
  }
  return shell;
}

describe("a Region with the Theme's ground", () => {
  it("without a tone takes the Chrome Overlay over the Shell record's ground, as an unauthored Region would", () => {
    const shell = resolveRegion({ regionKey: "header_main", config: { surface: { background: theme } } });
    const style = shell.style as Record<string, unknown>;
    expect(shell.attributes["data-phi-shell-chrome"]).toBe("true");
    expect(style.backgroundColor).toBe("var(--phi-region-chrome-color, transparent)");
    expect(style["--phi-region-background-light"]).toBeUndefined();
    expect(style["--phi-region-background-dark"]).toBeUndefined();
  });

  it("without a tone paints no Shell ground live either", () => {
    const shell = resolveRegion({
      regionKey: "header_main",
      config: { surface: { background: theme } },
      paint: { kind: "live", mode: "dark" },
    });
    expect(shell.attributes["data-phi-shell-chrome"]).toBe("true");
    expect(shell.style.backgroundColor).toBe("var(--phi-region-chrome-color, transparent)");
  });

  it.each(["light", "dark", "inverse"] as const)(
    "with the %s tone paints the Overlay itself under the tone's class, and not the tone's ground",
    (tone) => {
      const shell = resolveRegion({ regionKey: "footer_main", config: { surface: { background: theme, tone } } });
      const style = shell.style as Record<string, unknown>;
      expect(shell.attributes.className.split(" ")).toContain(`phi-tone-${tone}`);
      expect(shell.attributes["data-phi-shell-chrome"]).toBeUndefined();
      expect(style.backgroundColor).toBe(themeColour);
      expect(style.backgroundColor).not.toBe(PHI_SURFACE_TONE_GROUND);
      expect(style["--phi-region-background-light"]).toBeUndefined();
    },
  );

  it("outside the Chrome family paints the Overlay itself", () => {
    const shell = resolveRegion({ regionKey: "hero", config: { surface: { background: theme } } });
    expect(shell.attributes["data-phi-shell-chrome"]).toBeUndefined();
    expect(shell.style.backgroundColor).toBe(themeColour);
  });

  it("lets a stated colour on a toned Region win as before", () => {
    const shell = resolveRegion({
      regionKey: "footer_main",
      config: { surface: { background: { base: { kind: "color", color: "#123456" } }, tone: "inverse" } },
    });
    expect(shell.style.backgroundColor).toBe("#123456");
  });
});
