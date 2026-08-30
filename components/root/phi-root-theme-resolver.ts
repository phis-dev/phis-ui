import type { PhiSiteTheme } from "../../gateway/site-config";
import {
  resolvePhiShellRegionBackground,
  resolvePhiShellRegionColor,
} from "../../helpers/shell-region-style";
import {
  createPhiAntdThemeCssVarKey,
  resolvePhiAntdAliasTokens,
} from "../../theme/phi-antd-token-resolver";
import {
  buildPhiComponentTokens,
  buildPhiThemeStructuralTokens,
} from "../../theme/phi-theme";
import {
  resolvePhiThemePresetPlugin,
  resolvePhiThemePresetTokens,
  type PhiThemeMode,
  type PhiThemePresetPlugin,
} from "../../theme/phi-theme-presets";
import {
  applyPhiControlShapeComponentTokens,
  readPhiControlShape,
} from "../../theme/phi-control-shape";

const PHI_DEFAULT_DARK_NAV_BACKGROUND = "#001529";

export type PhiRootThemeFonts = {
  body?: string;
  mono?: string;
  serif?: string;
  accent?: string;
  display?: string;
};

export type PhiResolvedRootTheme = {
  mode: PhiThemeMode;
  theme: {
    cssVar: {
      prefix: string;
      key: string;
    };
    token: Record<string, unknown>;
    components: Record<string, Record<string, unknown>>;
  };
};

function mergeComponentThemes(
  defaults: Record<string, Record<string, unknown>>,
  overrides: Record<string, Record<string, unknown>> | undefined,
) {
  if (!overrides) {
    return defaults;
  }

  const merged: Record<string, Record<string, unknown>> = { ...defaults };
  for (const [componentName, componentOverrides] of Object.entries(overrides)) {
    merged[componentName] = {
      ...(defaults[componentName] ?? {}),
      ...(componentOverrides ?? {}),
    };
  }
  return merged;
}

export function resolvePhiRootTheme({
  siteTheme,
  mode,
  fonts,
  presets,
}: {
  siteTheme: PhiSiteTheme;
  mode: PhiThemeMode;
  fonts: PhiRootThemeFonts;
  presets: readonly PhiThemePresetPlugin[];
}): PhiResolvedRootTheme {
  const themePreset = resolvePhiThemePresetPlugin(presets, siteTheme?.preset);
  const presetTokens = resolvePhiThemePresetTokens(themePreset, mode);
  const sharedTokenDefaults = buildPhiThemeStructuralTokens();
  const resolvedThemeTokens = {
    ...sharedTokenDefaults,
    ...presetTokens,
    ...(siteTheme?.antd?.token ?? {}),
  } as Record<string, unknown>;
  const themeTokenInput = {
    ...resolvedThemeTokens,
    ...(fonts.body ? { fontFamily: fonts.body } : {}),
    ...(fonts.mono ? { fontFamilyCode: fonts.mono } : {}),
  };
  const effectiveThemeTokens = resolvePhiAntdAliasTokens(mode, themeTokenInput);
  const resolvedShellSiderBackground =
    resolvePhiShellRegionBackground(siteTheme?.shell, mode, { family: "sider", region: "left" }) ??
    resolvePhiShellRegionBackground(siteTheme?.shell, mode, { family: "sider", region: "right" }) ??
    (mode === "dark" ? PHI_DEFAULT_DARK_NAV_BACKGROUND : undefined);
  const resolvedShellSiderColor =
    resolvePhiShellRegionColor(siteTheme?.shell, mode, { family: "sider", region: "left" }) ??
    resolvePhiShellRegionColor(siteTheme?.shell, mode, { family: "sider", region: "right" });
  const resolvedShellHeaderMainBackground =
    resolvePhiShellRegionBackground(siteTheme?.shell, mode, { family: "header", region: "main" }) ??
    (mode === "dark" ? PHI_DEFAULT_DARK_NAV_BACKGROUND : undefined);
  const sharedComponentDefaults = buildPhiComponentTokens({
    layout: {
      ...(resolvedShellSiderBackground ? { siderBg: resolvedShellSiderBackground } : {}),
      ...(resolvedShellHeaderMainBackground ? { headerBg: resolvedShellHeaderMainBackground } : {}),
    },
    menu: {
      ...(resolvedShellSiderBackground
        ? {
            darkItemBg: resolvedShellSiderBackground,
            darkPopupBg: resolvedShellSiderBackground,
            darkSubMenuItemBg: resolvedShellSiderBackground,
          }
        : {}),
      ...(resolvedShellSiderColor
        ? {
            darkItemColor: resolvedShellSiderColor,
            darkGroupTitleColor: resolvedShellSiderColor,
            darkItemHoverColor: resolvedShellSiderColor,
          }
        : {}),
    },
  });
  const components = applyPhiControlShapeComponentTokens(mergeComponentThemes(
    sharedComponentDefaults,
    siteTheme?.antd?.components,
  ), readPhiControlShape(siteTheme.shape?.controls), effectiveThemeTokens);
  const token = {
    ...effectiveThemeTokens,
  };
  return {
    mode,
    theme: {
      cssVar: {
        prefix: "ant",
        key: createPhiAntdThemeCssVarKey("root", { mode, token, components }),
      },
      token,
      components,
    },
  };
}
