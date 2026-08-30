import "server-only";

import type { CSSProperties } from "react";

import type { PhiSiteTheme } from "../gateway/site-config";
import { buildPhiCssVars, buildPhiShellCssVars } from "./phi-css-vars";
import { resolvePhiServerThemeTokens } from "./phi-server-tokens";
import {
  PHI_CORE_THEME_PRESET_PLUGINS,
  type PhiThemePresetPlugin,
} from "./phi-theme-presets";

export type PhiPublishedRootStyle = CSSProperties & Record<`--${string}`, string>;
export type PhiPublishedRootTheme = {
  style: PhiPublishedRootStyle;
};

export function resolvePhiPublishedRootTheme({
  siteTheme,
  remRootValue,
  themePresets = PHI_CORE_THEME_PRESET_PLUGINS,
}: {
  siteTheme: PhiSiteTheme;
  remRootValue: number;
  themePresets?: readonly PhiThemePresetPlugin[];
}): PhiPublishedRootTheme {
  const themeTokens = resolvePhiServerThemeTokens(siteTheme, themePresets);
  return {
    style: {
      ...buildPhiCssVars(remRootValue, themeTokens),
      ...buildPhiShellCssVars({
        rootValue: remRootValue,
        shellTheme: siteTheme.shell,
        themeTokens,
      }),
      "--phi-rem-root-value": String(remRootValue),
    },
  };
}
