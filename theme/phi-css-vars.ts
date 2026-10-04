import type { CSSProperties } from "react";
import { PHI_LAYOUT } from "./phi-tokens";
import {
  resolvePhiShellMetric,
  resolvePhiShellSiderCollapsedWidth,
  resolvePhiShellSiderWidth,
  type PhiShellRegionTheme,
} from "../helpers/shell-region-style";
import type { PhiThemeTokens } from "./phi-theme";

export type PhiCssVars = CSSProperties & Record<`--${string}`, string>;

/**
 * How many pixels one `rem` is, everywhere: the document's font size, every length this package turns
 * into `rem`, and the px2rem pass over Ant Design's structure in `styles/antd-static.css`.
 *
 * It is the browser's default and Ant Design's, and it is fixed rather than a Theme setting because the
 * Ant Design structure is generated once for every Site -- a Site that moved it would have its own
 * lengths converted one way and the Controls' another. A Theme that wants everything larger moves
 * `fontSize` and the size tokens, which scale the Controls and the Theme together.
 */
export const PHI_REM_ROOT_PX = 16;

export type PhiShellCssVarsOptions = {
  shellTheme?: PhiShellRegionTheme | undefined;
  themeTokens?: Record<string, unknown>;
};

function resolveFinitePositiveNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function pxToRem(value: number) {
  return `${Number((value / PHI_REM_ROOT_PX).toFixed(6))}rem`;
}

function cssSizeToVar(value: number | string | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return pxToRem(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}

function resolveTokenNumber(
  themeTokens: Record<string, unknown> | undefined,
  key: string,
  fallback: number,
) {
  return resolveFinitePositiveNumber(themeTokens?.[key], fallback);
}

export function buildPhiCssVars(themeTokens?: Record<string, unknown>): PhiCssVars {
  return {
    "--phi-sidebar-width": pxToRem(resolveTokenNumber(themeTokens, "sidebarWidth", PHI_LAYOUT.sidebarWidth)),
  };
}

function resolveThemeTokenNumber(
    themeTokens: Record<string, unknown> | undefined,
    key: keyof PhiThemeTokens,
    fallback: number,
) {
  return resolveFinitePositiveNumber(themeTokens?.[key], fallback);
}

export function buildPhiShellCssVars({
  shellTheme,
  themeTokens,
}: PhiShellCssVarsOptions): PhiCssVars {
  const resolvedThemeTokens = themeTokens ?? {};
  const shellGap = resolveThemeTokenNumber(resolvedThemeTokens, "margin", 13);
  const shellPadding = resolveThemeTokenNumber(resolvedThemeTokens, "padding", 13);
  const shellRadius = resolveThemeTokenNumber(resolvedThemeTokens, "borderRadius", 8);
  const shellHeaderHeight = resolveFinitePositiveNumber(
    resolvePhiShellMetric(shellTheme, "height", { family: "header", region: "top" }) ??
      resolvePhiShellMetric(shellTheme, "height", { family: "header", region: "main" }) ??
      resolveThemeTokenNumber(resolvedThemeTokens, "controlHeight", 34),
    34,
  );
  const shellFooterHeight = resolveFinitePositiveNumber(
    resolvePhiShellMetric(shellTheme, "height", { family: "footer", region: "main" }) ??
      resolvePhiShellMetric(shellTheme, "height", { family: "footer", region: "top" }) ??
      resolveThemeTokenNumber(resolvedThemeTokens, "controlHeight", 34),
    34,
  );

  return {
    "--phi-shell-gap": pxToRem(shellGap),
    "--phi-shell-padding": pxToRem(shellPadding),
    "--phi-shell-radius": pxToRem(shellRadius),
    "--phi-shell-header-height": pxToRem(shellHeaderHeight),
    "--phi-shell-footer-height": pxToRem(shellFooterHeight),
    "--phi-shell-content-min-height": "100dvh",
    "--phi-shell-sider-width": cssSizeToVar(resolvePhiShellSiderWidth(shellTheme)) ?? pxToRem(200),
    "--phi-shell-sider-collapsed-width":
      cssSizeToVar(resolvePhiShellSiderCollapsedWidth(shellTheme)) ?? pxToRem(40),
    "--phi-shell-bg-image": "none",
    "--phi-shell-bg-size": "cover",
    "--phi-shell-bg-position": "center center",
    "--phi-shell-bg-repeat": "no-repeat",
    "--phi-shell-bg-opacity": "1",
    "--phi-shell-bg-blur": "0px",
  };
}
