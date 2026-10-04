import { afterEach, describe, expect, it } from "vitest";

import { PHI_CORE_THEME_PRESET_PLUGINS } from "../../theme/phi-theme-presets";
import type { PhiSiteTheme } from "../../types/site-config";
import { clearPhiRootThemeStates, resolvePhiRootThemeState } from "./phi-root-theme-resolver";

const corners = { topLeft: "rounded", topRight: "rounded", bottomRight: "rounded", bottomLeft: "rounded" };

function theme(borderRadius?: number) {
  return {
    preset: "phis",
    mode: "light",
    shape: { controls: corners },
    ...(borderRadius ? { style: { token: { borderRadius } } } : {}),
  } as unknown as PhiSiteTheme;
}

function resolve(siteTheme: PhiSiteTheme, fonts = {}) {
  return resolvePhiRootThemeState({ siteTheme, fonts, presets: PHI_CORE_THEME_PRESET_PLUGINS });
}

afterEach(() => clearPhiRootThemeStates());

describe("resolving the root Theme once per Theme", () => {
  it("answers the same Theme with the same state, without resolving it again", () => {
    const first = resolve(theme());
    expect(resolve(theme())).toBe(first);
  });

  it("resolves a changed Theme anew, because the content is the key", () => {
    const first = resolve(theme());
    const changed = resolve(theme(13));
    expect(changed).not.toBe(first);
    expect(changed.themes.light.token.borderRadius).toBe(13);
    expect(first.themes.light.token.borderRadius).not.toBe(13);
  });

  it("keys on the fonts as well", () => {
    expect(resolve(theme(), { body: "Lora" })).not.toBe(resolve(theme(), { body: "Inter" }));
  });

  it("hands every page a state nobody can write into", () => {
    const state = resolve(theme());
    expect(Object.isFrozen(state.themes.light.token)).toBe(true);
    expect(() => {
      (state.themes.light.token as Record<string, unknown>).borderRadius = 99;
    }).toThrow(TypeError);
  });

  it("keeps a bounded number of Themes, the least recently read leaving first", () => {
    const first = resolve(theme(1));
    const second = resolve(theme(2));
    for (let radius = 3; radius <= 16; radius += 1) resolve(theme(radius));
    // Sixteen held. Reading the first makes it the newest, so the seventeenth evicts the second.
    expect(resolve(theme(1))).toBe(first);
    resolve(theme(17));
    expect(resolve(theme(1))).toBe(first);
    expect(resolve(theme(2))).not.toBe(second);
  });
});
