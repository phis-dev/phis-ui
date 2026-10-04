import { resolvePhiSurfaceToneClassName, type PhiSurfaceTone } from "../../types/surface";
import type { CSSProperties } from "react";

import { PHI_THEME_BORDER_LINE, resolvePhiBorderWidgetStyle } from "../../helpers/border-widget-style";
import { hasPhiFlag } from "../../helpers/flags";
import { combinePhiBoxShadows } from "../../helpers/layout-style";
import {
  resolveRenderableBlockEffectsAttributes,
  resolveRenderableBlockEffectsStyle,
  type PhiRenderableBlockEffectsAttributes,
} from "../../helpers/renderable-block-effects";
import {
  resolvePhiShellRegionChrome,
  resolvePhiShellRegionGroundStyle,
  resolvePhiShellRegionTypography,
  resolvePhiShellRegionZIndex,
  resolvePhiShellSiderCollapsedWidth,
  resolvePhiShellSiderWidth,
  type PhiShellRegionChrome,
} from "../../helpers/shell-region-style";
import { PhiCmsFlags } from "../../constants/phi-cms";
import type {
  PhiBlockRuntime,
  PhiCmsRegionConfig,
  PhiCmsRegionKey,
  PhiRenderableBlock,
} from "../../types";
import { resolvePhiCmsBorderSource } from "../../types/cms-border-source";
import type { PhiSurface } from "../../types/surface";
import type { PhiSurfaceGround } from "../../helpers/surface-style";
import { resolvePhiRenderableBlockGeometry } from "../../types/renderable-block-geometry";
import { createPhiSignalAddress } from "../../types/signals";
import { resolvePhiPaddingStyle } from "../layouts/phi-layout-contract";
import { phiRegionUsesShellChromeOverlay } from "../root/phi-shell-chrome-overlay";
import {
  normalizePhiBackgroundWidgetConfig,
  phiBackgroundWidgetConfigPaintsGround,
  resolvePhiBackgroundGroundFilter,
  resolvePhiBackgroundMotion,
  resolvePhiBackgroundMotionHostStyle,
  resolvePhiBackgroundPane,
  resolvePhiBackgroundWidgetStyle,
  type PhiCmsBackgroundWidgetConfig,
} from "../widgets/config/background";

/**
 * The Region-shell resolver (LAYOUTING.md "Regions"): what a Shell Region's root element looks like, for
 * the static renderer and the client-enhanced one alike.
 *
 * Both renderers used to carry their own copy of this, and the copies drifted apart. The static one
 * ignored a stated width, gave every Region kind the full-height `calc`, let `min-height: 0` beat the
 * full-height minimum, and kept the light glass tint in dark mode; the client one let the flat radius
 * wipe a Border config's corners, and the two asked the Chrome Overlay rule different questions. What
 * is left in the renderers is what only one of them has -- the live runtime state, the collapsible
 * Sider, the background motion layer -- and nothing here knows about React beyond `CSSProperties`.
 *
 * The one thing that genuinely differs is how the ground is painted, and it is a parameter, `paint`:
 *
 * - `published` is for a renderer that does not know the colour mode. Both modes are published as the
 *   `--phi-region-*-light` and `--phi-region-*-dark` custom properties and `styles/shell.css` switches
 *   them on `data-phi-theme-mode`.
 * - `live` is for a renderer that reads the mode from the Theme provider and paints that mode inline.
 */

export type PhiCmsRegionShellTheme = NonNullable<NonNullable<PhiBlockRuntime["site"]["theme"]>["shell"]>;

type PhiShellRegionChromeTokens = NonNullable<
  NonNullable<Parameters<typeof resolvePhiShellRegionChrome>[2]>["tokens"]
>;

export type PhiCmsRegionShellPaint =
  | { kind: "published" }
  | { kind: "live"; mode: "light" | "dark"; tokens?: PhiShellRegionChromeTokens };

export type PhiCmsRegionShellFamily = "header" | "footer" | "sider" | "other";

type PhiCmsRegionShellModeStyle = CSSProperties & Record<`--phi-region-${string}`, string | number>;

export type PhiCmsRegionShellAttributes = PhiRenderableBlockEffectsAttributes & {
  "data-phi-region-key": PhiCmsRegionKey;
  "data-phi-region-type": number | undefined;
  "data-phi-shell-chrome": "true" | undefined;
  "data-phi-renderable-block": "true";
  "data-phi-signal-receiver": string;
  "data-phi-block-visibility": string;
  "data-phi-viewport-flags": number | undefined;
  "data-phi-block-enabled": "true" | "false";
  className: string;
};

export type PhiCmsRegionShellInput = {
  regionKey: PhiCmsRegionKey;
  /** The Region config as rendered: the stored one, or the client's merge of it with the live state. */
  config: PhiCmsRegionConfig;
  shellTheme?: PhiCmsRegionShellTheme;
  paint: PhiCmsRegionShellPaint;
  /**
   * Whether this renderer animates a moving Background itself. Only the client one does, with a layer of
   * its own; the host then keeps just the Background's Effect and isolates the layer beneath the
   * content.
   */
  animatesBackground?: boolean;
  previewMode?: boolean;
  regionType?: number;
  className?: string;
  style?: CSSProperties;
};

export type PhiCmsRegionShell = {
  family: PhiCmsRegionShellFamily;
  /**
   * The mode the Region's content is drawn in, when its Surface asks for another; the renderer puts
   * `PhiSurfaceTone` around the element, which carries the tone's class.
   */
  tone: PhiSurfaceTone | null;
  element: "header" | "footer" | "aside" | "div";
  visibility: NonNullable<PhiCmsRegionConfig["visibility"]>;
  enabled: boolean;
  siderWidth: CSSProperties["width"];
  siderCollapsedWidth: CSSProperties["width"];
  /** The authored Background, or null where the stored one paints nothing. */
  backgroundConfig: PhiCmsBackgroundWidgetConfig | null;
  /** The Background moves and this renderer animates it; the renderer mounts the motion layer. */
  animatesBackground: boolean;
  /** A still paint that needs a layer of its own -- a softened picture; the renderer mounts it. */
  ground: PhiSurfaceGround | null;
  /** The configured line as one `border` value, for a separator that repeats the Region's own. */
  borderLine: string | undefined;
  effectsConfig: Partial<PhiRenderableBlock>;
  attributes: PhiCmsRegionShellAttributes;
  /** The root element's style, framed: the Region root carries no padding and no margin of its own. */
  style: CSSProperties;
  /** The content wrapper's style, which is where Region padding lives (LAYOUTING.md "Regions"). */
  contentStyle: CSSProperties;
};

/*
 * The longhands every Region that paints the Shell Chrome Overlay (SHELL.md) carries, read from the
 * custom properties the Root Layout publishes. The colour is here as well as in `shell.css`'s marker
 * rule, because a live renderer paints its ground inline and an inline ground would otherwise sit over
 * it. The picture is anchored to the viewport so the Regions share one painting instead of each starting
 * it again: a gradient runs from the Header into the Sider, and a Pattern keeps its grid across the
 * seam.
 */
const PHI_CMS_REGION_SHELL_CHROME_OVERLAY_STYLE: CSSProperties = {
  backgroundColor: "var(--phi-region-chrome-color, transparent)",
  backgroundImage: "var(--phi-region-chrome-image, none)",
  backgroundSize: "var(--phi-region-chrome-size, auto)",
  backgroundPosition: "var(--phi-region-chrome-position, 0 0)",
  backgroundRepeat: "var(--phi-region-chrome-repeat, repeat)",
  backgroundAttachment: "var(--phi-region-chrome-attachment, fixed)",
  backdropFilter: "var(--phi-region-chrome-filter, none)",
  WebkitBackdropFilter: "var(--phi-region-chrome-filter, none)",
};

function normalizeCssLength(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

export function resolvePhiCmsRegionShellFamily(regionKey: PhiCmsRegionKey): PhiCmsRegionShellFamily {
  if (regionKey === "header_top" || regionKey === "header_main" || regionKey === "header_bottom") {
    return "header";
  }
  if (regionKey === "footer_top" || regionKey === "footer_main" || regionKey === "footer_bottom") {
    return "footer";
  }
  if (regionKey === "sider_left" || regionKey === "sider_right") {
    return "sider";
  }
  return "other";
}

/*
 * A Region's edge, from its Surface.
 *
 * `theme` is the separator: the Site's own line on the edge that faces the Page, which is why it depends on
 * the family -- a Header draws it below, a Footer above, a Sider on its inner side, any other Region all
 * round. `custom` draws the configured border, corners included, as it says. A Region states no corner of
 * its own otherwise: it spans its part of the frame and has no surface step to take. Nothing configured
 * draws nothing; separators are never implicit (LAYOUTING.md "Regions").
 */
function resolveRegionEdgeStyle(
  surface: PhiSurface | null | undefined,
  regionKey: PhiCmsRegionKey,
  family: PhiCmsRegionShellFamily,
): CSSProperties {
  const source = resolvePhiCmsBorderSource(surface?.borderSource, surface?.border);
  if (source === "custom") {
    return resolvePhiBorderWidgetStyle(surface?.border);
  }
  if (source === "none") {
    return {};
  }
  if (family === "header") return { borderBottom: PHI_THEME_BORDER_LINE };
  if (family === "footer") return { borderTop: PHI_THEME_BORDER_LINE };
  if (family === "sider") {
    return regionKey === "sider_left"
      ? { borderInlineEnd: PHI_THEME_BORDER_LINE }
      : { borderInlineStart: PHI_THEME_BORDER_LINE };
  }
  return { border: PHI_THEME_BORDER_LINE };
}

function resolveRegionBorderLine(surface: PhiSurface | null | undefined): string | undefined {
  const source = resolvePhiCmsBorderSource(surface?.borderSource, surface?.border);
  if (source === "theme") return PHI_THEME_BORDER_LINE;
  if (source === "custom") {
    const line = resolvePhiBorderWidgetStyle(surface?.border).border;
    return typeof line === "string" ? line : undefined;
  }
  return undefined;
}

/**
 * The Region's shell, or null where the Region renders nothing: hidden, or collapsed in a preview.
 * `header_bottom` is exempt from the preview collapse because the Page, not the Area, owns its content.
 */
export function resolvePhiCmsRegionShell({
  regionKey,
  config,
  shellTheme,
  paint,
  animatesBackground = false,
  previewMode = false,
  regionType,
  className,
  style,
}: PhiCmsRegionShellInput): PhiCmsRegionShell | null {
  const visibility = config.visibility ?? "visible";
  const enabled = config.enabled ?? true;
  if (
    visibility === "hidden" ||
    (previewMode && regionKey !== "header_bottom" && hasPhiFlag(config.flags, PhiCmsFlags.Collapsed))
  ) {
    return null;
  }

  const family = resolvePhiCmsRegionShellFamily(regionKey);
  const isHeader = family === "header";
  const isSider = family === "sider";
  const geometry = resolvePhiRenderableBlockGeometry({ ...config, visibility });
  // A sider that states no width takes the Theme's; this Region's own answer, not the reader's.
  const siderWidth = geometry.inline.size?.css ?? resolvePhiShellSiderWidth(shellTheme);
  const siderCollapsedWidth =
    normalizeCssLength(config.collapsedWidth) ?? resolvePhiShellSiderCollapsedWidth(shellTheme);
  const top = normalizeCssLength(config.offsetTop) ?? 0;
  const sticky = config.sticky === true;
  /*
   * Full height is a Sider's behaviour and nobody else's (LAYOUTING.md: "where the Region family
   * supports it"). The static renderer used to give every Region kind the viewport-height `calc` when
   * the flag was set, the client one only a Sider.
   */
  const fullHeight = isSider && config.fullHeight === true;
  const stuck = isHeader ? sticky : isSider && (sticky || fullHeight);
  const blockSize = geometry.block.size?.css;
  const fullHeightSize =
    fullHeight && !blockSize
      ? `calc(100dvh - ${typeof top === "number" ? `${top}px` : top})`
      : blockSize;
  const zIndex = config.zIndex ?? resolvePhiShellRegionZIndex(regionKey, config.fullHeight === true);

  /*
   * A Background config that paints nothing is not an authored ground. The Builder writes one onto every
   * Region draft it persists, so its presence would otherwise mean "authored" for every Region an author
   * has ever opened.
   */
  const surface = config.surface ?? null;
  const surfaceBackground: PhiCmsBackgroundWidgetConfig | null = surface?.background
    ? normalizePhiBackgroundWidgetConfig(surface.background)
    : null;
  const backgroundConfig = phiBackgroundWidgetConfigPaintsGround(surfaceBackground) ? surfaceBackground : null;
  /*
   * A pane on a Region without a ground of its own frosts the Shell's ground for this Region -- the
   * Theme's record, or the family's fallback -- which is what glass on a bare Header has always meant.
   * A Region that paints its own ground carries its pane inside that Background, as every Surface does.
   */
  const shellPane = backgroundConfig == null ? resolvePhiBackgroundPane(surfaceBackground) : null;
  const backgroundMoves =
    animatesBackground &&
    backgroundConfig != null &&
    resolvePhiBackgroundMotion(backgroundConfig) != null;
  const groundFilter = backgroundConfig == null ? null : resolvePhiBackgroundGroundFilter(backgroundConfig);
  const ground: PhiSurfaceGround | null = backgroundConfig != null && groundFilter != null && !backgroundMoves
    ? {
      paint: resolvePhiBackgroundWidgetStyle({ ...backgroundConfig, filter: null, motion: null }),
      filter: groundFilter,
      motion: null,
    }
    : null;
  const backgroundStyle = backgroundConfig == null || ground != null
    ? null
    : backgroundMoves
      ? resolvePhiBackgroundMotionHostStyle(backgroundConfig)
      : resolvePhiBackgroundWidgetStyle(backgroundConfig);

  const chromeInput = {
    shadow: surface?.shadow ?? undefined,
    effect: shellPane ?? undefined,
    tokens: paint.kind === "live" ? paint.tokens : undefined,
  };
  const chrome: Record<"light" | "dark", PhiShellRegionChrome> = {
    light: resolvePhiShellRegionChrome(regionKey, shellTheme, { ...chromeInput, mode: "light" }),
    dark: resolvePhiShellRegionChrome(regionKey, shellTheme, { ...chromeInput, mode: "dark" }),
  };
  /*
   * The Shell Chrome Overlay (SHELL.md) is decided on both modes' grounds, by both renderers. A Region
   * that authored a ground for either mode authored chrome of its own, and the static renderer can only
   * say so once, as the `data-phi-shell-chrome` marker; the client one used to ask about its live mode
   * alone, so the same Region took the overlay in one renderer and not in the other.
   *
   * The config asked about is the one that survived `phiBackgroundWidgetConfigPaintsGround` above, not
   * the stored one: the Builder persists an empty Background record for every Region an author has ever
   * opened, and the raw value is never null for those.
   */
  const usesShellChromeOverlay = phiRegionUsesShellChromeOverlay({
    regionKey,
    backgroundConfig,
    pane: shellPane,
    grounds: [chrome.light.background, chrome.dark.background],
  });

  /*
   * The ground. Published, it is the pair of custom properties `shell.css` paints from, because it may
   * be a colour or a gradient and only CSS can tell which without guessing; nothing inline may name a
   * ground then, or it would win over the switch. That is what a glass Effect did: its tint is a colour
   * computed for one mode, and the light one, set inline, stayed on in dark mode. The tint is already
   * each mode's ground, so the inline colour now points at the switched variable instead of holding a
   * value.
   *
   * Live, the mode is known and the ground is painted inline, as a longhand: the same style carries
   * longhands from an authored Background and from the overlay, and React warns when a rerender has to
   * drop one of those from an element whose `background` shorthand is still set.
   */
  const liveChrome = paint.kind === "live" ? chrome[paint.mode] : null;
  const modeStyle: PhiCmsRegionShellModeStyle = liveChrome
    ? {}
    : {
      ...(chrome.light.background == null
        ? {}
        : { "--phi-region-background-light": String(chrome.light.background) }),
      ...(chrome.dark.background == null
        ? {}
        : { "--phi-region-background-dark": String(chrome.dark.background) }),
      "--phi-region-color-light": String(chrome.light.color),
      "--phi-region-color-dark": String(chrome.dark.color),
    };
  const paintedChrome = liveChrome ?? chrome.light;
  const effectStyle: CSSProperties | undefined =
    liveChrome || paintedChrome.effectStyle?.backgroundColor == null
      ? paintedChrome.effectStyle
      : { ...paintedChrome.effectStyle, backgroundColor: "var(--phi-region-background)" };
  const groundStyle = liveChrome && backgroundStyle == null
    ? resolvePhiShellRegionGroundStyle(liveChrome.background)
    : {};
  const typography = resolvePhiShellRegionTypography(regionKey, shellTheme, {
    fontSize: config.fontSize,
    lineHeight: config.lineHeight,
  });

  const effectsConfig: Partial<PhiRenderableBlock> = {
    visibility,
    enabled,
    size: config.size,
    minSize: config.minSize,
    maxSize: config.maxSize,
    collapsedSizeHint: config.collapsedSizeHint,
    zIndex,
    opacity: config.opacity,
    effects: config.effects,
  };
  const effectsAttributes = resolveRenderableBlockEffectsAttributes(effectsConfig);
  const viewportFlags = typeof config.viewportFlags === "number" && config.viewportFlags !== 0
    ? config.viewportFlags
    : undefined;

  /*
   * Geometry, each property written once. The copies used to write a property, then write it again from
   * the block geometry further down, and which one won depended on where each copy put its spread: a
   * stated width lost to `100%` in one, a full-height minimum lost to `min-height: 0` in the other.
   *
   * A Sider sizes from its own width and the stated bounds may still clamp it. Every other Region fills
   * its host unless it states a width, and a Region with a maximum width is a centred column in it
   * (SHELL.md "Page Layout Boundary") -- the inline margins carry the centring, since the frame forces
   * `margin: 0` and a `margin` in the Region config is not a thing the renderer reads.
   */
  const geometryStyle: CSSProperties = isSider
    ? {
      width: siderWidth,
      minWidth: geometry.inline.min?.css ?? siderWidth,
      maxWidth: geometry.inline.max?.css ?? siderWidth,
      height: fullHeightSize,
      minHeight: geometry.block.min?.css ?? (fullHeight ? fullHeightSize : undefined),
      maxHeight: geometry.block.max?.css,
      alignSelf: fullHeight ? "stretch" : "start",
      flex: fullHeight ? "1 1 auto" : undefined,
      overflowX: "visible",
      overflowY: fullHeight ? "auto" : "visible",
    }
    : {
      width: geometry.inline.size?.css ?? "100%",
      minWidth: geometry.inline.min?.css ?? 0,
      maxWidth: geometry.inline.max?.css,
      height: blockSize,
      minHeight: geometry.block.min?.css,
      maxHeight: geometry.block.max?.css,
    };

  const rootStyle: CSSProperties = {
    padding: 0,
    ...modeStyle,
    ...(backgroundStyle ?? {}),
    position: stuck ? "sticky" : "relative",
    top: stuck ? top : undefined,
    insetBlockStart: isHeader && stuck ? top : undefined,
    zIndex,
    ...geometryStyle,
    color: liveChrome ? liveChrome.color : "var(--phi-region-color)",
    ...effectStyle,
    ...groundStyle,
    ...(usesShellChromeOverlay ? PHI_CMS_REGION_SHELL_CHROME_OVERLAY_STYLE : {}),
    boxShadow: combinePhiBoxShadows(
      typeof backgroundStyle?.boxShadow === "string" ? backgroundStyle.boxShadow : undefined,
      paintedChrome.effectStyle?.boxShadow,
      paintedChrome.shadow,
    ),
    ...(typography.fontSize ? { fontSize: typography.fontSize } : {}),
    ...(typography.lineHeight ? { lineHeight: typography.lineHeight } : {}),
    ...resolveRegionEdgeStyle(surface, regionKey, family),
    ...(config.opacity == null ? {} : { opacity: config.opacity }),
    ...(enabled ? {} : { opacity: Math.min(config.opacity ?? 1, 0.5), pointerEvents: "none" }),
    ...(visibility === "collapsed" ? { overflow: "hidden" } : {}),
    ...resolveRenderableBlockEffectsStyle(effectsConfig),
    ...(backgroundMoves || ground != null ? { isolation: "isolate" } : {}),
    ...style,
    margin: 0,
    ...(!isSider && geometry.inline.max != null ? { marginInline: "auto" } : {}),
  };

  return {
    family,
    element: isHeader ? "header" : family === "footer" ? "footer" : isSider ? "aside" : "div",
    visibility,
    enabled,
    siderWidth,
    siderCollapsedWidth,
    tone: surface?.tone ?? null,
    backgroundConfig,
    animatesBackground: backgroundMoves,
    ground,
    borderLine: resolveRegionBorderLine(surface),
    effectsConfig,
    attributes: {
      "data-phi-region-key": regionKey,
      "data-phi-region-type": regionType,
      "data-phi-shell-chrome": usesShellChromeOverlay ? "true" : undefined,
      "data-phi-renderable-block": "true",
      "data-phi-signal-receiver": createPhiSignalAddress("region", regionKey),
      "data-phi-block-visibility": visibility,
      "data-phi-viewport-flags": viewportFlags,
      "data-phi-block-enabled": enabled ? "true" : "false",
      ...effectsAttributes,
      className: ["phi-cms-region-shell", resolvePhiSurfaceToneClassName(surface?.tone), className]
        .filter(Boolean)
        .join(" "),
    },
    style: rootStyle,
    contentStyle: resolvePhiPaddingStyle({
      padding: config.padding,
      paddingTop: config.paddingTop,
      paddingRight: config.paddingRight,
      paddingBottom: config.paddingBottom,
      paddingLeft: config.paddingLeft,
    }),
  };
}
