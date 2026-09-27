import "server-only";

import { buildPhiThemeStructuralTokens } from "./phi-theme";
import { resolvePhiAntdAliasTokens } from "./phi-antd-token-resolver";
import type { PhiThemeTokens } from "./phi-theme-tokens";
import {
  PHI_CORE_THEME_PRESET_PLUGINS,
  resolvePhiThemePresetPlugin,
  resolvePhiThemeColorTokens,
  type PhiThemeMode,
  type PhiThemePalette,
  type PhiThemePresetPlugin,
} from "./phi-theme-presets";

/**
 * The names a Server render reads, cut from the house's stated vocabulary.
 *
 * Narrower than the Client's, because a Server Component reads through the published `--phi-*`
 * variables rather than through a hook and only this much of the Theme reaches CSS. Cut rather than
 * written out a second time, so a name can never mean one thing here and another there.
 */
export type PhiServerThemeTokens = Pick<
  PhiThemeTokens,
  | "colorBgContainer"
  | "colorBgElevated"
  | "colorBgSpotlight"
  | "colorFillQuaternary"
  | "colorBorderSecondary"
  | "colorText"
  | "colorTextSecondary"
  | "colorTextTertiary"
  | "colorTextHeading"
  | "colorTextLightSolid"
  | "colorPrimary"
  | "lineWidth"
  | "lineType"
  | "boxShadowSecondary"
  | "boxShadowTertiary"
  | "fontSize"
  | "fontSizeLG"
  | "fontSizeHeading2"
  | "lineHeight"
  | "lineHeightLG"
  | "lineHeightHeading2"
  | "fontWeightStrong"
  | "borderRadiusSM"
  | "borderRadiusLG"
  | "padding"
  | "paddingSM"
  | "paddingLG"
  | "paddingXXS"
  | "marginXS"
  | "marginSM"
  | "sizeXS"
  | "sizeSM"
  | "sizeMD"
  | "sizeLG"
  | "controlHeight"
>;

type PhiServerThemeSource = {
  preset?: string | null;
  presetVersion?: number | null;
  palette?: PhiThemePalette | null;
  style?: {
    token?: Record<string, unknown>;
  } | null;
};

const phiServerThemeTokenCache = new Map<string, PhiServerThemeTokens>();

function readRequiredNumberToken(value: string | number, key: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Ant Design token "${key}" must resolve to a finite number.`);
  }

  return value;
}

export function resolvePhiServerThemeTokens({
  siteTheme,
  mode,
  themePresets = PHI_CORE_THEME_PRESET_PLUGINS,
}: {
  siteTheme?: PhiServerThemeSource;
  /** The resolved projection. A Site set to `system` is decided before it reaches here. */
  mode: PhiThemeMode;
  themePresets?: readonly PhiThemePresetPlugin[];
}): PhiServerThemeTokens {
  const cacheKey = JSON.stringify({
    themePresets: themePresets.map((preset) => [preset.key, preset.version]),
    mode,
    preset: siteTheme?.preset ?? null,
    presetVersion: siteTheme?.presetVersion ?? null,
    palette: siteTheme?.palette ?? null,
    token: siteTheme?.style?.token ?? {},
  });
  const cached = phiServerThemeTokenCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const themePreset = resolvePhiThemePresetPlugin(themePresets, siteTheme?.preset);
  const colorTokens = resolvePhiThemeColorTokens(themePreset, siteTheme?.palette, mode);
  const structuralTokens = buildPhiThemeStructuralTokens();
  const explicitTokens = {
    ...colorTokens,
    ...(siteTheme?.style?.token ?? {}),
  };
  const tokenInput = {
    ...structuralTokens,
    ...explicitTokens,
  };
  const resolvedToken = resolvePhiAntdAliasTokens(mode, tokenInput);
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
