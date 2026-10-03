"use client";

import { useMemo, type ReactNode } from "react";
import { ConfigProvider, type ThemeConfig } from "antd";

import { createPhiAntdThemeCssVarKey } from "../../theme/phi-antd-token-resolver";
import type { PhiThemeMode } from "../../theme/phi-theme-presets";

/**
 * A region drawn in a theme of its own, beside the one the page wears.
 *
 * The Theme workspace shows a draft before it is published: the Controls inside this scope take the
 * draft's tokens and component tokens, everything outside keeps the Site's. Nothing is inherited from the
 * surrounding theme, so a token the draft leaves out is the primitive's default rather than the live
 * Site's value bleeding into the preview.
 *
 * `scope` names the region in the CSS variable key. The key also hashes the mode and every token, so two
 * drafts that differ in one value never share cached variables -- the reason a scope must not hand its
 * own key in.
 */
export function PhiThemeScopeControl({
  scope,
  mode,
  token,
  components,
  children,
}: {
  scope: string;
  mode: PhiThemeMode;
  /** The resolved alias tokens the region is drawn with. */
  token: Record<string, unknown>;
  /** Per-component token overrides, as the theme helpers produce them. */
  components?: Record<string, Record<string, unknown>>;
  children: ReactNode;
}) {
  const theme = useMemo<ThemeConfig>(() => ({
    inherit: false,
    cssVar: {
      prefix: "ant",
      key: createPhiAntdThemeCssVarKey(scope, { mode, token, components }),
    },
    token,
    components: components as ThemeConfig["components"],
  }), [components, mode, scope, token]);

  return <ConfigProvider theme={theme}>{children}</ConfigProvider>;
}
