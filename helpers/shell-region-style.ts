import type { CSSProperties } from "react";
import type { PhiCssLength } from "../types/length";
import { PHI_COLOR } from "../theme/antd-css-var-contract";
import type { PhiShadow, PhiLayoutEffectId } from "../types/layout-style";
import { resolvePhiShadow, resolvePhiLayoutEffectStyle } from "./layout-style";

type PhiShellRegionMode = "light" | "dark";

type PhiShellRegionConfig = {
  light?: {
    background?: string | null;
    color?: string | null;
  } | null;
  dark?: {
    background?: string | null;
    color?: string | null;
  } | null;
};

type PhiShellRegionMap = {
  header?: {
    top?: PhiShellRegionConfig | null;
    main?: PhiShellRegionConfig | null;
    bottom?: PhiShellRegionConfig | null;
  } | null;
  sider?: {
    left?: PhiShellRegionConfig | null;
    right?: PhiShellRegionConfig | null;
  } | null;
  footer?: {
    top?: PhiShellRegionConfig | null;
    main?: PhiShellRegionConfig | null;
    bottom?: PhiShellRegionConfig | null;
  } | null;
};

export type PhiShellRegionTheme = PhiShellRegionConfig & PhiShellRegionMap;

type PhiShellRegionFamily = "header" | "sider" | "footer";
type PhiShellRegionName = "top" | "main" | "bottom" | "left" | "right";
type PhiShellMetricKey = "height" | "width" | "collapsedWidth" | "sticky" | "offsetTop" | "zIndex";
type PhiShellMetricOrTypographyKey = PhiShellMetricKey | "fontSize" | "lineHeight";
type PhiShellRegionKey =
  | "header_top"
  | "header_main"
  | "header_bottom"
  | "hero"
  | "sider_left"
  | "sider_right"
  | "content"
  | "footer_top"
  | "footer_main"
  | "footer_bottom"
  | "drawer_left"
  | "drawer_right";

function readRegionValue(
  regionConfig: PhiShellRegionConfig | null | undefined,
  mode: PhiShellRegionMode,
  key: "background" | "color",
) {
  return (mode === "dark" ? regionConfig?.dark?.[key] : regionConfig?.light?.[key])?.trim() || undefined;
}

function resolveRegionFamily(
  shellTheme: PhiShellRegionTheme | undefined,
  family?: PhiShellRegionFamily,
): PhiShellRegionConfig | null | undefined {
  if (family === "header") {
    return shellTheme?.header as PhiShellRegionConfig | undefined;
  }

  if (family === "sider") {
    return shellTheme?.sider as PhiShellRegionConfig | undefined;
  }

  if (family === "footer") {
    return shellTheme?.footer as PhiShellRegionConfig | undefined;
  }

  return undefined;
}

function resolveRegionConfig(
  shellTheme: PhiShellRegionTheme | undefined,
  family?: PhiShellRegionFamily,
  region?: PhiShellRegionName,
) {
  if (family === "header") {
    if (region === "top") return shellTheme?.header?.top;
    if (region === "main") return shellTheme?.header?.main;
    if (region === "bottom") return shellTheme?.header?.bottom;
    return undefined;
  }

  if (family === "sider") {
    if (region === "left") return shellTheme?.sider?.left;
    if (region === "right") return shellTheme?.sider?.right;
    return undefined;
  }

  if (family === "footer") {
    if (region === "top") return shellTheme?.footer?.top;
    if (region === "main") return shellTheme?.footer?.main;
    if (region === "bottom") return shellTheme?.footer?.bottom;
    return undefined;
  }

  return undefined;
}

type PhiShellMetricRegion = PhiShellRegionConfig & {
  height?: CSSProperties["height"];
  width?: CSSProperties["width"];
  collapsedWidth?: CSSProperties["width"];
  fontSize?: CSSProperties["fontSize"];
  lineHeight?: CSSProperties["lineHeight"];
  sticky?: boolean;
  offsetTop?: PhiCssLength;
  zIndex?: number;
};

export type PhiShellRegionTypography = {
  fontSize?: CSSProperties["fontSize"];
  lineHeight?: CSSProperties["lineHeight"];
};

export type PhiShellRegionChrome = {
  mode: PhiShellRegionMode;
  background?: CSSProperties["background"];
  color?: CSSProperties["color"];
  shadow?: CSSProperties["boxShadow"];
  effectStyle?: CSSProperties;
};

type PhiShellRegionChromeTokens = {
  colorBgElevated: string;
  colorBgContainer: string;
  colorBgSpotlight: string;
  colorTextLightSolid: string;
  colorText: string;
};

function resolvePhiShellRegionFamilyAndName(regionKey: PhiShellRegionKey): {
  family?: PhiShellRegionFamily;
  region?: PhiShellRegionName;
} {
  const family =
    regionKey === "header_top" || regionKey === "header_main" || regionKey === "header_bottom"
      ? "header"
      : regionKey === "sider_left" || regionKey === "sider_right"
        ? "sider"
        : regionKey === "footer_top" || regionKey === "footer_main" || regionKey === "footer_bottom"
          ? "footer"
          : undefined;
  const region =
    regionKey === "header_top"
      ? "top"
      : regionKey === "header_main"
        ? "main"
        : regionKey === "header_bottom"
          ? "bottom"
          : regionKey === "sider_left"
            ? "left"
            : regionKey === "sider_right"
              ? "right"
              : regionKey === "footer_top"
                ? "top"
                : regionKey === "footer_main"
                  ? "main"
                  : regionKey === "footer_bottom"
                    ? "bottom"
                    : undefined;

  return { family, region };
}

function readMetricValue(
  regionConfig: PhiShellMetricRegion | null | undefined,
  key: PhiShellMetricOrTypographyKey,
) {
  const value = regionConfig?.[key];

  if (key === "sticky") {
    return typeof value === "boolean" ? value : undefined;
  }

  if (typeof value === "number" || typeof value === "string") {
    return value;
  }

  return undefined;
}

export function resolvePhiShellMetric(
  shellTheme: PhiShellRegionTheme | undefined,
  key: PhiShellMetricOrTypographyKey,
  options: {
    family?: PhiShellRegionFamily;
    region?: PhiShellRegionName;
  },
) {
  const regionConfig = resolveRegionConfig(shellTheme, options.family, options.region);
  const familyConfig = resolveRegionFamily(shellTheme, options.family) as PhiShellMetricRegion | null | undefined;
  const rootConfig = shellTheme as (PhiShellRegionTheme & PhiShellMetricRegion) | undefined;

  return (
    readMetricValue(regionConfig, key) ??
    readMetricValue(familyConfig, key) ??
    readMetricValue(rootConfig, key)
  );
}

export function resolvePhiShellRegionTypography(
  regionKey: PhiShellRegionKey,
  shellTheme?: PhiShellRegionTheme | undefined,
  config?: {
    fontSize?: CSSProperties["fontSize"];
    lineHeight?: CSSProperties["lineHeight"];
  } | null,
): PhiShellRegionTypography {
  const { family, region } = resolvePhiShellRegionFamilyAndName(regionKey);

  return {
    fontSize:
      config?.fontSize ??
      (resolvePhiShellMetric(shellTheme, "fontSize", { family, region }) as CSSProperties["fontSize"] | undefined),
    lineHeight:
      config?.lineHeight ??
      (resolvePhiShellMetric(shellTheme, "lineHeight", { family, region }) as CSSProperties["lineHeight"] | undefined),
  };
}

export function resolvePhiShellRegionChrome(
  regionKey: PhiShellRegionKey,
  shellTheme?: PhiShellRegionTheme | undefined,
  config?: {
    mode?: "light" | "dark";
    background?: CSSProperties["background"];
    effect?: PhiLayoutEffectId;
    shadow?: PhiShadow;
    tokens?: Partial<PhiShellRegionChromeTokens>;
  } | null,
): PhiShellRegionChrome {
  const { family, region } = resolvePhiShellRegionFamilyAndName(regionKey);
  const isHeader = family === "header";
  const isSider = family === "sider";
  const isFooter = family === "footer";
  const resolvedMode: PhiShellRegionMode = config?.mode === "dark" ? "dark" : "light";
  const tokens: PhiShellRegionChromeTokens = {
    colorBgElevated: config?.tokens?.colorBgElevated ?? PHI_COLOR.bgElevated,
    colorBgContainer: config?.tokens?.colorBgContainer ?? PHI_COLOR.bgContainer,
    colorBgSpotlight: config?.tokens?.colorBgSpotlight ?? PHI_COLOR.bgSpotlight,
    colorTextLightSolid: config?.tokens?.colorTextLightSolid ?? PHI_COLOR.textLightSolid,
    colorText: config?.tokens?.colorText ?? PHI_COLOR.text,
  };
  const shellBackground = resolvePhiShellRegionBackground(shellTheme, resolvedMode, { family, region });
  const shellColor = resolvePhiShellRegionColor(shellTheme, resolvedMode, { family, region });
  const resolvedShadow = resolvePhiShadow(config?.shadow);
  const opaqueBackground = isHeader
    ? config?.background ??
      shellBackground ??
      (resolvedMode === "dark" ? "#001529" : tokens.colorBgElevated)
    : isSider
      ? config?.background ??
        shellBackground ??
        (resolvedMode === "dark" ? "#001529" : tokens.colorBgContainer)
      : isFooter
        ? config?.background ??
          shellBackground ??
          (resolvedMode === "dark" ? "#001529" : tokens.colorBgContainer)
        : resolvedMode === "dark"
          ? (config?.background ?? shellBackground ?? tokens.colorBgSpotlight)
          : (config?.background ?? shellBackground ?? tokens.colorBgContainer);
  const effectStyle = resolvePhiLayoutEffectStyle({
    effect: config?.effect,
    background: opaqueBackground,
  });
  const resolvedBackground = effectStyle?.background ?? opaqueBackground;
  const resolvedTextColor =
    shellColor ?? (resolvedMode === "dark" ? tokens.colorTextLightSolid : tokens.colorText);

  return {
    mode: resolvedMode,
    background: resolvedBackground,
    color: resolvedTextColor,
    shadow: resolvedShadow,
    effectStyle,
  };
}

export function resolvePhiShellSiderWidth(shellTheme: PhiShellRegionTheme | undefined): CSSProperties["width"] {
  return (
    resolvePhiShellMetric(shellTheme, "width", { family: "sider", region: "left" }) ??
    resolvePhiShellMetric(shellTheme, "width", { family: "sider", region: "right" }) ??
    200
  ) as CSSProperties["width"];
}

export function resolvePhiShellSiderCollapsedWidth(
  shellTheme: PhiShellRegionTheme | undefined,
): CSSProperties["width"] {
  return (
    resolvePhiShellMetric(shellTheme, "collapsedWidth", { family: "sider", region: "left" }) ??
    resolvePhiShellMetric(shellTheme, "collapsedWidth", { family: "sider", region: "right" }) ??
    40
  ) as CSSProperties["width"];
}

export function resolvePhiShellRegionZIndex(regionKey: PhiShellRegionKey, fullHeight = false) {
  if (regionKey === "header_top") {
    return 210;
  }

  if (regionKey === "header_main") {
    return 200;
  }

  if (regionKey === "header_bottom") {
    return 205;
  }

  if (regionKey === "sider_left") {
    return fullHeight ? 300 : 100;
  }

  if (regionKey === "sider_right") {
    return 100;
  }

  if (regionKey === "footer_top") {
    return 220;
  }

  if (regionKey === "footer_main") {
    return 200;
  }

  if (regionKey === "footer_bottom") {
    return 210;
  }

  if (regionKey === "content") {
    return 0;
  }

  if (regionKey === "hero") {
    return 0;
  }

  return undefined;
}

export function resolvePhiShellRegionBackground(
  shellTheme: PhiShellRegionTheme | undefined,
  mode: PhiShellRegionMode,
  options: {
    family?: PhiShellRegionFamily;
    region?: PhiShellRegionName;
  },
) {
  const regionConfig = resolveRegionConfig(shellTheme, options.family, options.region);
  const familyConfig = resolveRegionFamily(shellTheme, options.family);

  return (
    readRegionValue(regionConfig, mode, "background") ??
    readRegionValue(familyConfig, mode, "background") ??
    readRegionValue(shellTheme, mode, "background")
  );
}

export function resolvePhiShellRegionColor(
  shellTheme: PhiShellRegionTheme | undefined,
  mode: PhiShellRegionMode,
  options: {
    family?: PhiShellRegionFamily;
    region?: PhiShellRegionName;
  },
) {
  const regionConfig = resolveRegionConfig(shellTheme, options.family, options.region);
  const familyConfig = resolveRegionFamily(shellTheme, options.family);

  return (
    readRegionValue(regionConfig, mode, "color") ??
    readRegionValue(familyConfig, mode, "color") ??
    readRegionValue(shellTheme, mode, "color")
  );
}
