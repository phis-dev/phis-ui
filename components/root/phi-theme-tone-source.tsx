"use client";

import { createContext, useContext } from "react";

import type { PhiConfigLocale } from "./phi-config-provider";
import type { PhiRootThemeByMode } from "./phi-root-theme-resolver";
import type { PhiThemeCustomColorPalette, PhiThemeMode } from "../../theme/phi-theme-presets";

/**
 * What a Surface needs to draw its content in another mode (`tone`, LAYOUTING.md "Surface tone").
 *
 * The root resolves both modes before the page reaches the browser -- the mode switch needs them anyway
 * -- so a tone scope takes the other one from here instead of resolving a Theme of its own. `pageMode` is
 * the mode the page is in; `inverse` is read against it, not against the nearest scope, so every inverse
 * Surface on a page is the same mode and they all share one set of variables.
 */
export type PhiThemeToneSource = {
  pageMode: PhiThemeMode;
  themes: PhiRootThemeByMode;
  customColorsByMode: Record<PhiThemeMode, PhiThemeCustomColorPalette>;
  locale: PhiConfigLocale;
};

const PhiThemeToneSourceContext = createContext<PhiThemeToneSource | null>(null);

export const PhiThemeToneSourceProvider = PhiThemeToneSourceContext.Provider;

export function usePhiThemeToneSource(): PhiThemeToneSource | null {
  return useContext(PhiThemeToneSourceContext);
}
