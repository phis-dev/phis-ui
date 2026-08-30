import "server-only";

import { buildPhiThemeStructuralTokens } from "./phi-theme";
import { resolvePhiAntdAliasTokens } from "./phi-antd-token-resolver";
import {
  PHI_CORE_THEME_PRESET_PLUGINS,
  resolvePhiThemePresetPlugin,
  resolvePhiThemePresetTokens,
  type PhiThemeMode,
  type PhiThemePresetPlugin,
} from "./phi-theme-presets";

export type PhiServerThemeTokens = {
  colorBgContainer: string;
  colorBgElevated: string;
  colorBgSpotlight: string;
  colorFillQuaternary: string;
  colorBorderSecondary: string;
  colorText: string;
  colorTextSecondary: string;
  colorTextTertiary: string;
  colorTextHeading: string;
  colorTextLightSolid: string;
  colorPrimary: string;
  lineWidth: number;
  lineType: string;
  boxShadowSecondary: string;
  boxShadowTertiary: string;
  fontSize: number;
  fontSizeLG: number;
  fontSizeHeading2: number;
  lineHeight: number;
  lineHeightLG: number;
  lineHeightHeading2: number;
  fontWeightStrong: number;
  borderRadiusSM: number;
  borderRadiusLG: number;
  padding: number;
  paddingSM: number;
  paddingLG: number;
  paddingXXS: number;
  marginXS: number;
  marginSM: number;
  sizeXS: number;
  sizeSM: number;
  sizeMD: number;
  sizeLG: number;
  controlHeight: number;
};

type PhiServerThemeSource = {
  mode?: PhiThemeMode | null;
  preset?: string | null;
  presetVersion?: number | null;
  antd?: {
    token?: Record<string, unknown>;
    components?: Record<string, Record<string, unknown>>;
  };
};

const phiServerThemeTokenCache = new Map<string, PhiServerThemeTokens>();

function readRequiredNumberToken(value: string | number, key: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Ant Design token "${key}" must resolve to a finite number.`);
  }

  return value;
}

export function resolvePhiServerThemeTokens(
  siteTheme?: PhiServerThemeSource,
  themePresets: readonly PhiThemePresetPlugin[] = PHI_CORE_THEME_PRESET_PLUGINS,
): PhiServerThemeTokens {
  const cacheKey = JSON.stringify({
    themePresets: themePresets.map((preset) => [preset.key, preset.version]),
    mode: siteTheme?.mode ?? "light",
    preset: siteTheme?.preset ?? null,
    presetVersion: siteTheme?.presetVersion ?? null,
    token: siteTheme?.antd?.token ?? {},
  });
  const cached = phiServerThemeTokenCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const resolvedThemeMode = siteTheme?.mode === "dark" ? "dark" : "light";
  const themePreset = resolvePhiThemePresetPlugin(themePresets, siteTheme?.preset);
  const presetTokens = resolvePhiThemePresetTokens(themePreset, resolvedThemeMode);
  const structuralTokens = buildPhiThemeStructuralTokens();
  const explicitTokens = {
    ...presetTokens,
    ...(siteTheme?.antd?.token ?? {}),
  };
  const tokenInput = {
    ...structuralTokens,
    ...explicitTokens,
  };
  const resolvedToken = resolvePhiAntdAliasTokens(resolvedThemeMode, tokenInput);
  const tokens: PhiServerThemeTokens = {
    ...resolvedToken,
    colorBgContainer: resolvedToken.colorBgContainer,
    colorBgElevated: resolvedToken.colorBgElevated,
    colorBgSpotlight: resolvedToken.colorBgSpotlight,
    colorFillQuaternary: resolvedToken.colorFillQuaternary,
    colorBorderSecondary: resolvedToken.colorBorderSecondary,
    colorText: resolvedToken.colorText,
    colorTextSecondary: resolvedToken.colorTextSecondary,
    colorTextTertiary: resolvedToken.colorTextTertiary,
    colorTextHeading: resolvedToken.colorTextHeading,
    colorTextLightSolid: resolvedToken.colorTextLightSolid,
    colorPrimary: resolvedToken.colorPrimary,
    lineWidth: resolvedToken.lineWidth,
    lineType: resolvedToken.lineType,
    boxShadowSecondary: resolvedToken.boxShadowSecondary,
    boxShadowTertiary: resolvedToken.boxShadowTertiary,
    fontSize: resolvedToken.fontSize,
    fontSizeLG: resolvedToken.fontSizeLG,
    fontSizeHeading2: readRequiredNumberToken(resolvedToken.fontSizeHeading2, "fontSizeHeading2"),
    lineHeight: resolvedToken.lineHeight,
    lineHeightLG: resolvedToken.lineHeightLG,
    lineHeightHeading2: resolvedToken.lineHeightHeading2,
    fontWeightStrong: resolvedToken.fontWeightStrong,
    borderRadiusSM: resolvedToken.borderRadiusSM,
    borderRadiusLG: resolvedToken.borderRadiusLG,
    padding: resolvedToken.padding,
    paddingSM: resolvedToken.paddingSM,
    paddingLG: resolvedToken.paddingLG,
    paddingXXS: resolvedToken.paddingXXS,
    marginXS: resolvedToken.marginXS,
    marginSM: resolvedToken.marginSM,
    sizeXS: resolvedToken.sizeXS,
    sizeSM: resolvedToken.sizeSM,
    sizeMD: resolvedToken.sizeMD,
    sizeLG: resolvedToken.sizeLG,
    controlHeight: resolvedToken.controlHeight,
  };

  phiServerThemeTokenCache.set(cacheKey, tokens);
  return tokens;
}
