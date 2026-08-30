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

export type PhiShellCssVarsOptions = {
  rootValue: number;
  shellTheme?: PhiShellRegionTheme | undefined;
  themeTokens?: Record<string, unknown>;
};

function resolveFinitePositiveNumber(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function pxToRem(value: number, rootValue: number) {
  const effectiveRoot = resolveFinitePositiveNumber(rootValue, 16);
  const remValue = value / effectiveRoot;
  return `${Number(remValue.toFixed(6))}rem`;
}

function cssSizeToVar(value: number | string | undefined, rootValue: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return pxToRem(value, rootValue);
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

export function buildPhiCssVars(
  rootValue = 16,
  themeTokens?: Record<string, unknown>,
): PhiCssVars {
  return {
    "--phi-sidebar-width": pxToRem(resolveTokenNumber(themeTokens, "sidebarWidth", PHI_LAYOUT.sidebarWidth), rootValue),
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
  rootValue,
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
    "--phi-shell-gap": pxToRem(shellGap, rootValue),
    "--phi-shell-padding": pxToRem(shellPadding, rootValue),
    "--phi-shell-radius": pxToRem(shellRadius, rootValue),
    "--phi-shell-header-height": pxToRem(shellHeaderHeight, rootValue),
    "--phi-shell-footer-height": pxToRem(shellFooterHeight, rootValue),
    "--phi-shell-content-min-height": "100dvh",
    "--phi-shell-sider-width": cssSizeToVar(resolvePhiShellSiderWidth(shellTheme), rootValue) ?? pxToRem(200, rootValue),
    "--phi-shell-sider-collapsed-width":
      cssSizeToVar(resolvePhiShellSiderCollapsedWidth(shellTheme), rootValue) ?? pxToRem(40, rootValue),
    "--phi-shell-bg-image": "none",
    "--phi-shell-bg-size": "cover",
    "--phi-shell-bg-position": "center center",
    "--phi-shell-bg-repeat": "no-repeat",
    "--phi-shell-bg-opacity": "1",
    "--phi-shell-bg-blur": "0px",
  };
}
