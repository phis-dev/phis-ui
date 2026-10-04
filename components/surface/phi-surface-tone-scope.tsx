"use client";

import type { ReactNode } from "react";

import { PhiNestedModeConfigProvider } from "../root/phi-config-provider";
import type { PhiThemeToneSource } from "../root/phi-theme-tone-source";
import type { PhiThemeMode } from "../../theme/phi-theme-presets";

/**
 * The other mode, around a Surface's content -- the heavy half of a tone, loaded only where a Surface
 * asks for a mode its content is not in. The Theme comes from the root, which resolved both modes; its
 * variables are written under `cssVarKey`, the class the Surface's box carries (`phi-tone-*`).
 */
export function PhiSurfaceToneScope({
  mode,
  cssVarKey,
  source,
  children,
}: {
  mode: PhiThemeMode;
  cssVarKey: string;
  source: PhiThemeToneSource;
  children: ReactNode;
}) {
  return (
    <PhiNestedModeConfigProvider
      mode={mode}
      theme={source.themes[mode]}
      cssVarKey={cssVarKey}
      locale={source.locale}
      customColors={source.customColorsByMode[mode]}
    >
      {children}
    </PhiNestedModeConfigProvider>
  );
}
