import type { CSSProperties, ReactNode } from "react";

import { resolvePhiBorderWidgetStyle } from "../../helpers/border-widget-style";
import {
  phiBackgroundWidgetConfigPaintsGround,
  resolvePhiBackgroundWidgetStyle,
  type PhiCmsBackgroundWidgetConfig,
} from "../widgets/config/background";
import {
  resolvePhiShellRegionChrome,
  resolvePhiShellRegionTypography,
  resolvePhiShellRegionZIndex,
  resolvePhiShellSiderWidth,
} from "../../helpers/shell-region-style";
import { combinePhiBoxShadows } from "../../helpers/layout-style";
import { phiRegionUsesShellChromeOverlay } from "../root/phi-shell-chrome-overlay";
import { resolveRenderableBlockEffectsAttributes, resolveRenderableBlockEffectsStyle } from "../../helpers/renderable-block-effects";
import { hasPhiFlag } from "../../helpers/flags";
import { PhiCmsFlags } from "../../constants/phi-cms";
import type { PhiBlockRuntime, PhiCmsRegionConfig, PhiCmsRegionKey } from "../../types";
import type { PhiCmsBorderWidgetConfig } from "../../types/cms-config";
import { createPhiSignalAddress } from "../../types/signals";
import { resolvePhiPaddingStyle } from "../layouts/phi-layout-contract";

type PhiRuntimeShellTheme = NonNullable<NonNullable<PhiBlockRuntime["site"]["theme"]>["shell"]>;
type PhiRegionModeStyle = CSSProperties & Record<`--phi-region-${string}`, string | number>;

function normalizeCssLength(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function isBorderConfig(value: unknown): value is PhiCmsBorderWidgetConfig {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export type PhiCmsRegionStaticProps = {
  children: ReactNode;
  className?: string;
  regionKey: PhiCmsRegionKey;
  config?: PhiCmsRegionConfig;
  shellTheme?: PhiRuntimeShellTheme;
  style?: CSSProperties;
  regionType?: number;
  previewMode?: boolean;
};

export function PhiCmsRegionStatic({
  children,
  className,
  regionKey,
  config = {},
  shellTheme,
  style,
  regionType,
  previewMode = false,
}: PhiCmsRegionStaticProps) {
  const resolvedVisibility = config.visibility ?? "visible";
  const resolvedEnabled = config.enabled ?? true;
  if (
    resolvedVisibility === "hidden" ||
    (previewMode && regionKey !== "header_bottom" && hasPhiFlag(config.flags, PhiCmsFlags.Collapsed))
  ) {
    return null;
  }

  const isHeader =
    regionKey === "header_top" || regionKey === "header_main" || regionKey === "header_bottom";
  const isFooter =
    regionKey === "footer_top" || regionKey === "footer_main" || regionKey === "footer_bottom";
  const isSider = regionKey === "sider_left" || regionKey === "sider_right";
  const resolvedSize =
    resolvedVisibility === "collapsed"
      ? config.collapsedSizeHint ?? config.size
      : config.size;
  const resolvedHeight = normalizeCssLength(resolvedSize?.height);
  const resolvedWidth = normalizeCssLength(resolvedSize?.width) ?? resolvePhiShellSiderWidth(shellTheme);
  const resolvedTop = normalizeCssLength(config.offsetTop) ?? 0;
  const resolvedBorderRadius = normalizeCssLength(config.borderRadius);
  const resolvedFullHeight = config.fullHeight === true;
  const resolvedFullHeightSize =
    resolvedFullHeight && !resolvedHeight
      ? `calc(100dvh - ${typeof resolvedTop === "number" ? `${resolvedTop}px` : resolvedTop})`
      : resolvedHeight;
  const shouldStickSider = config.sticky === true || resolvedFullHeight;
  const resolvedZIndex = config.zIndex ?? resolvePhiShellRegionZIndex(regionKey, resolvedFullHeight);
  /*
   * A Background config that paints nothing is not an authored ground. The Builder writes one onto every
   * Region draft it persists, so its presence would otherwise mean "authored" for every Region an author
   * has ever opened.
   */
  const regionBackgroundConfig = phiBackgroundWidgetConfigPaintsGround(config.backgroundConfig)
    ? config.backgroundConfig as PhiCmsBackgroundWidgetConfig
    : null;
  const regionBackgroundStyle = regionBackgroundConfig
    ? resolvePhiBackgroundWidgetStyle({ ...regionBackgroundConfig, effect: null })
    : null;
  const lightChrome = resolvePhiShellRegionChrome(regionKey, shellTheme, {
    mode: "light",
    background: typeof config.background === "string" ? config.background : undefined,
    shadow: config.shadow,
    effect: config.effect,
  });
  const darkChrome = resolvePhiShellRegionChrome(regionKey, shellTheme, {
    mode: "dark",
    background: typeof config.background === "string" ? config.background : undefined,
    shadow: config.shadow,
    effect: config.effect,
  });
  const resolvedTypography = resolvePhiShellRegionTypography(regionKey, shellTheme, {
    fontSize: config.fontSize,
    lineHeight: config.lineHeight,
  });
  const fallbackBorder = "1px solid var(--ant-color-border-secondary)";
  const resolvedBorderStyle =
    config.border == null || config.border === false
      ? {}
      : isBorderConfig(config.border)
        ? resolvePhiBorderWidgetStyle(config.border)
        : isHeader
          ? { borderBottom: typeof config.border === "string" ? config.border : fallbackBorder }
          : isFooter
            ? { borderTop: typeof config.border === "string" ? config.border : fallbackBorder }
            : isSider
              ? regionKey === "sider_left"
                ? { borderInlineEnd: typeof config.border === "string" ? config.border : fallbackBorder }
                : { borderInlineStart: typeof config.border === "string" ? config.border : fallbackBorder }
              : { border: typeof config.border === "string" ? config.border : fallbackBorder };
  const effectsConfig = {
    visibility: resolvedVisibility,
    enabled: resolvedEnabled,
    size: resolvedSize,
    minSize: config.minSize,
    maxSize: config.maxSize,
    zIndex: resolvedZIndex,
    opacity: config.opacity,
    effects: config.effects,
  };
  const effectsAttributes = resolveRenderableBlockEffectsAttributes(effectsConfig);
  const regionPaddingStyle = resolvePhiPaddingStyle({
    padding: config.padding,
    paddingTop: config.paddingTop,
    paddingRight: config.paddingRight,
    paddingBottom: config.paddingBottom,
    paddingLeft: config.paddingLeft,
  });
  /*
   * The Shell Chrome Overlay (SHELL.md), read from the custom properties the Root Layout publishes.
   * Which Regions take it, and when, is decided in one place for both this renderer and the client one.
   *
   * The config handed over is the one that survived `phiBackgroundWidgetConfigPaintsGround` above, not
   * the stored one. The Builder persists an empty Background record for every Region an author has
   * ever opened, and the raw value is never null for those -- so this renderer read them as authored
   * and dropped them out of the overlay, while the client renderer, which passes the filtered config,
   * kept them in. One decision in one place only holds if both sides ask it the same question.
   */
  const usesShellChromeOverlay = phiRegionUsesShellChromeOverlay({
    regionKey,
    backgroundConfig: regionBackgroundConfig,
    effect: config.effect,
    grounds: [lightChrome.background, darkChrome.background],
  });
  const modeStyle: PhiRegionModeStyle = {
    ...(lightChrome.background == null
      ? {}
      : { "--phi-region-background-light": String(lightChrome.background) }),
    ...(darkChrome.background == null
      ? {}
      : { "--phi-region-background-dark": String(darkChrome.background) }),
    "--phi-region-color-light": String(lightChrome.color),
    "--phi-region-color-dark": String(darkChrome.color),
  };
  const baseStyle: CSSProperties = {
    ...modeStyle,
    ...(regionBackgroundStyle ?? {}),
    position: isHeader
      ? config.sticky ? "sticky" : "relative"
      : isSider
        ? shouldStickSider ? "sticky" : "relative"
        : "relative",
    top: isHeader
      ? config.sticky ? resolvedTop : undefined
      : isSider && shouldStickSider
        ? resolvedTop
        : undefined,
    insetBlockStart: isHeader && config.sticky ? resolvedTop : undefined,
    zIndex: resolvedZIndex,
    width: isSider ? resolvedWidth : "100%",
    borderRadius: resolvedBorderRadius,
    minWidth: isSider ? resolvedWidth : 0,
    maxWidth: isSider ? resolvedWidth : undefined,
    height: resolvedFullHeightSize,
    minBlockSize: isSider && resolvedFullHeight ? resolvedFullHeightSize ?? "100dvh" : undefined,
    minHeight: isSider && resolvedFullHeight ? 0 : undefined,
    alignSelf: isSider && resolvedFullHeight ? "stretch" : isSider ? "start" : undefined,
    flex: isSider && resolvedFullHeight ? "1 1 auto" : undefined,
    overflowX: isSider ? "visible" : undefined,
    overflowY: isSider ? resolvedFullHeight ? "auto" : "visible" : undefined,
    color: "var(--phi-region-color)",
    ...lightChrome.effectStyle,
    /*
     * The ground itself is painted by `shell.css`, from `--phi-region-background`, because it may be a
     * colour or a gradient and only CSS can tell which without guessing. Nothing here is the `background`
     * shorthand: React warns when a rerender drops a longhand from an element whose shorthand is still
     * set, and everything below is a longhand.
     *
     * The Chrome Overlay is anchored to the viewport so the Regions share one painting instead of each
     * starting it again: a gradient runs from the Header into the Sider, and a Pattern keeps its grid
     * across the seam.
     */
    ...(usesShellChromeOverlay
      ? {
        backgroundImage: "var(--phi-region-chrome-image, none)",
        backgroundSize: "var(--phi-region-chrome-size, auto)",
        backgroundPosition: "var(--phi-region-chrome-position, 0 0)",
        backgroundRepeat: "var(--phi-region-chrome-repeat, repeat)",
        backgroundAttachment: "var(--phi-region-chrome-attachment, fixed)",
        backdropFilter: "var(--phi-region-chrome-filter, none)",
        WebkitBackdropFilter: "var(--phi-region-chrome-filter, none)",
      }
      : {}),
    boxShadow: combinePhiBoxShadows(regionBackgroundStyle?.boxShadow, lightChrome.effectStyle?.boxShadow, lightChrome.shadow),
    ...(resolvedTypography.fontSize ? { fontSize: resolvedTypography.fontSize } : {}),
    ...(resolvedTypography.lineHeight ? { lineHeight: resolvedTypography.lineHeight } : {}),
    ...resolvedBorderStyle,
    ...(config.minSize?.width == null ? {} : { minWidth: config.minSize.width }),
    ...(config.minSize?.height == null ? {} : { minHeight: config.minSize.height }),
    ...(config.maxSize?.width == null ? {} : { maxWidth: config.maxSize.width }),
    ...(config.maxSize?.height == null ? {} : { maxHeight: config.maxSize.height }),
    ...(config.opacity == null ? {} : { opacity: config.opacity }),
    ...(resolvedEnabled ? {} : { opacity: Math.min(config.opacity ?? 1, 0.5), pointerEvents: "none" }),
    ...(resolvedVisibility === "collapsed" ? { overflow: "hidden" } : {}),
    ...resolveRenderableBlockEffectsStyle(effectsConfig),
    ...style,
  };
  const commonProps = {
    "data-phi-region-key": regionKey,
    "data-phi-region-type": regionType,
    "data-phi-shell-chrome": usesShellChromeOverlay ? "true" : undefined,
    "data-phi-renderable-block": "true",
    "data-phi-signal-receiver": createPhiSignalAddress("region", regionKey),
    "data-phi-block-visibility": resolvedVisibility,
    "data-phi-viewport-flags": config.viewportFlags || undefined,
    "data-phi-block-enabled": resolvedEnabled ? "true" : "false",
    ...effectsAttributes,
    className: ["phi-cms-region-shell", className].filter(Boolean).join(" "),
    style: { padding: 0, ...baseStyle, margin: 0 },
  };
  const content = (
    <div className="phi-cms-region-shell__content" style={regionPaddingStyle}>
      {children}
    </div>
  );

  if (isHeader) return <header {...commonProps}>{content}</header>;
  if (isFooter) return <footer {...commonProps}>{content}</footer>;
  if (isSider) return <aside {...commonProps}>{content}</aside>;
  return <div {...commonProps}>{content}</div>;
}
