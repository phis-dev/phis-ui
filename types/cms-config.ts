import type { CSSProperties } from "react";
import { readPhiControlSize, type PhiControlSize } from "./control";
import { readPhiLengthValue, type PhiCssLength } from "./length";
import type { PhiResponsiveValue } from "./responsive";

import {
  isPhiAnchorWidgetPlacement,
  resolvePhiRenderableBlockAnchor,
  type PhiAnchorWidgetPlacement,
} from "../components/controls/phi-anchor-control-contract";
import {
  readBoolean,
  readCssSize,
  readNumber,
  readRenderableBlockConfig,
  readRenderableBlockSize,
  readString,
} from "../components/widgets/config/parser-primitives";
import {
  normalizePhiBackgroundWidgetConfig,
  type PhiCmsBackgroundWidgetConfig,
} from "../components/widgets/config/background";
import type {
  PhiRenderableBlockBase,
  PhiRenderableBlockAnchor,
  PhiRenderableBlockSize,
} from "./renderable-block";
import {
  isPhiLayoutEffectId,
  readPhiShadow,
  type PhiShadow,
  type PhiLayoutEffectId,
} from "./layout-style";
import {
  resolvePhiAnchorPlacement,
  type PhiBaseLayoutSlotStates,
} from "../components/layouts/phi-layout-contract";
import { applyPhiLayoutDefaults } from "../helpers/cms-layout-defaults";
import { resolvePhiLayoutDefaults } from "../helpers/cms-layout-defaults";
import { normalizeRenderableBlockAnchor } from "../helpers/renderable-block-serialization";

export type PhiCmsPluginConfigBase = Record<string, unknown>;

// CMS configs are sparse override shapes.
// Parsers normalize them back to the full runtime contract and fill in defaults.
export type PhiCmsRenderableBlockConfigBase = PhiCmsPluginConfigBase & PhiRenderableBlockBase;

// Layout configs add shared composition chrome on top of the renderable block base.
export type PhiCmsLayerBase = PhiCmsRenderableBlockConfigBase & {
  initialSlotStates?: PhiBaseLayoutSlotStates;
  padding?: CSSProperties["padding"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
  background?: CSSProperties["background"];
  border?: CSSProperties["border"];
  borderRadius?: CSSProperties["borderRadius"];
};

// Directional layouts extend the shared layer chrome with flow-specific spacing.
export type PhiCmsDirectionalLayoutConfigBase = PhiCmsLayerBase & {
  gap?: CSSProperties["gap"];
  align?: CSSProperties["alignItems"];
  justify?: CSSProperties["justifyContent"];
  wrap?: boolean | CSSProperties["flexWrap"];
};

export type PhiCmsSequentialLayoutConfigBase = PhiCmsLayerBase & {
  gap?: CSSProperties["gap"];
  wrap?: boolean | CSSProperties["flexWrap"];
};

export type PhiCmsPaddingWidgetConfig = {
  padding?: number | string;
  gap?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
};

type JsonRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function readInitialSlotStates(value: unknown): PhiBaseLayoutSlotStates | undefined {
  if (Array.isArray(value)) {
    const normalized = value.map((candidate) =>
      candidate === "expanded" || candidate === "collapsed" || candidate === "hidden" ? candidate : undefined,
    );
    return normalized.some((candidate) => candidate !== undefined) ? normalized : undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  const next: Record<number, "expanded" | "collapsed" | "hidden"> = {};

  for (const [key, candidate] of Object.entries(raw)) {
    const slotIndex = Number(key);
    if (!Number.isInteger(slotIndex) || slotIndex < 0) {
      continue;
    }
    if (candidate === "expanded" || candidate === "collapsed" || candidate === "hidden") {
      next[slotIndex] = candidate;
    }
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const next = value
    .map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""))
    .filter((candidate) => candidate.length > 0);

  return [...new Set(next)];
}

export function normalizePhiPaddingWidgetConfig(config: unknown): PhiCmsPaddingWidgetConfig | null {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return null;
  }

  const raw = config as Record<string, unknown>;
  const padding = readCssSize(raw.padding);
  const gap = readCssSize(raw.gap);
  const paddingTop = readCssSize(raw.paddingTop);
  const paddingRight = readCssSize(raw.paddingRight);
  const paddingBottom = readCssSize(raw.paddingBottom);
  const paddingLeft = readCssSize(raw.paddingLeft);

  if (
    padding == null &&
    gap == null &&
    paddingTop == null &&
    paddingRight == null &&
    paddingBottom == null &&
    paddingLeft == null
  ) {
    return null;
  }

  return {
    ...(padding == null ? {} : { padding }),
    ...(gap == null ? {} : { gap }),
    ...(paddingTop == null ? {} : { paddingTop }),
    ...(paddingRight == null ? {} : { paddingRight }),
    ...(paddingBottom == null ? {} : { paddingBottom }),
    ...(paddingLeft == null ? {} : { paddingLeft }),
  };
}

export function mergePhiCmsConfigValues<T extends JsonRecord>(
  defaults: Partial<T> | null | undefined,
  override: Partial<T> | null | undefined,
): T | null {
  const next: JsonRecord = {
    ...(isPlainObject(defaults) ? defaults : {}),
  };

  if (isPlainObject(override)) {
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined && value !== null) {
        next[key] = value;
      }
    }
  }

  if (Object.keys(next).length === 0) {
    return null;
  }

  return next as T;
}

export function mergePhiPaddingWidgetConfig(
  base: PhiCmsPaddingWidgetConfig | null | undefined,
  override: PhiCmsPaddingWidgetConfig | null | undefined,
): PhiCmsPaddingWidgetConfig | null {
  return mergePhiCmsConfigValues<PhiCmsPaddingWidgetConfig>(base, override);
}

export type PhiCmsBorderWidgetConfig = {
  borderWidth?: number;
  borderStyle?: Exclude<NonNullable<CSSProperties["borderStyle"]>, undefined> | "none";
  borderColor?: string;
  borderTopLeftRadius?: number | string;
  borderTopRightRadius?: number | string;
  borderBottomLeftRadius?: number | string;
  borderBottomRightRadius?: number | string;
};

export function mergePhiBorderWidgetConfig(
  base: PhiCmsBorderWidgetConfig | null | undefined,
  override: PhiCmsBorderWidgetConfig | null | undefined,
): PhiCmsBorderWidgetConfig | null {
  return mergePhiCmsConfigValues<PhiCmsBorderWidgetConfig>(base, override);
}

export function expandPhiBorderRadiusConfig(value: unknown): PhiCmsBorderWidgetConfig | null {
  const radius = readCssSize(value);
  if (radius == null) {
    return null;
  }

  if (typeof radius === "number") {
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      borderBottomRightRadius: radius,
      borderBottomLeftRadius: radius,
    };
  }

  const parts: string[] = [];
  let token = "";
  let parenthesisDepth = 0;
  for (const character of radius.trim()) {
    if (character === "(") {
      parenthesisDepth += 1;
    } else if (character === ")") {
      parenthesisDepth -= 1;
      if (parenthesisDepth < 0) {
        return null;
      }
    } else if (character === "/" && parenthesisDepth === 0) {
      return null;
    }

    if (/\s/.test(character) && parenthesisDepth === 0) {
      if (token) {
        parts.push(token);
        token = "";
      }
    } else {
      token += character;
    }
  }
  if (token) {
    parts.push(token);
  }

  if (parenthesisDepth !== 0 || parts.length === 0 || parts.length > 4) {
    return null;
  }

  const [first, second = first, third = first, fourth = second] = parts;
  return {
    borderTopLeftRadius: first,
    borderTopRightRadius: second,
    borderBottomRightRadius: parts.length === 2 ? first : third,
    borderBottomLeftRadius: parts.length === 2 ? second : fourth,
  };
}

export type PhiCmsContentLayoutConfig = PhiCmsLayerBase & {
  size?: PhiRenderableBlockSize;
  margin?: CSSProperties["margin"];
  anchor?: PhiAnchorWidgetPlacement;
  padding?: CSSProperties["padding"];
  paddingLeft?: CSSProperties["paddingLeft"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingBottom?: CSSProperties["paddingBottom"];
};

export type PhiCmsFormLayoutConfig = PhiCmsContentLayoutConfig;

export type PhiCmsFlexLayoutDistribution = "anchor" | "between" | "around" | "evenly";

export type PhiCmsFlexLayoutConfig = PhiCmsSequentialLayoutConfigBase & {
  distribution?: PhiCmsFlexLayoutDistribution;
  verticalSeparators?: boolean;
  separatorBeforeFirst?: boolean;
  separatorSpan?: PhiCssLength;
};

export type PhiCmsFlexVerticalLayoutConfig = PhiCmsLayerBase & {
  gap?: CSSProperties["gap"];
};

export type PhiCmsStackLayoutConfig = PhiCmsLayerBase & {
  activeSlotKey?: string;
  defaultActiveSlotKey?: string;
  mountPolicy?: "active" | "keep";
  slotTransition?: "none" | "fade-over";
};

export type PhiCmsCollapsibleLayoutConfig = PhiCmsLayerBase & {
  anchor?: PhiRenderableBlockAnchor;
  panelMinHeight?: PhiCssLength;
  accordion?: boolean;
  slotTitles?: string[];
  translateSlotTitles?: boolean;
  defaultOpenSlotKeys?: string[];
  collapsible?: "header" | "icon" | "disabled";
  bordered?: boolean;
  ghost?: boolean;
  expandIconPlacement?: "start" | "end";
  collapseSize?: PhiControlSize;
  titleStrong?: boolean;
  headerPadding?: CSSProperties["padding"];
  innerPadding?: CSSProperties["padding"];
};

export type PhiCmsGridLayoutSlotPlacementConfig = {
  slotIndex: number;
  span?: PhiResponsiveValue<number>;
  offset?: PhiResponsiveValue<number>;
};

export type PhiCmsGridLayoutConfig = PhiCmsDirectionalLayoutConfigBase & {
  anchor?: PhiRenderableBlockAnchor;
  columnGap?: CSSProperties["columnGap"];
  slotPlacements?: PhiCmsGridLayoutSlotPlacementConfig[];
  slotBackground?: string;
  slotBorder?: string;
  slotBorderRadius?: CSSProperties["borderRadius"];
  slotShadow?: PhiShadow;
};

export type PhiCmsThreeColumnLayoutConfig = PhiCmsDirectionalLayoutConfigBase & {
  balancedSides?: boolean;
  leftWidth?: PhiCssLength;
  middleWidth?: PhiCssLength;
  rightWidth?: PhiCssLength;
  contentAlign?: CSSProperties["alignItems"];
};

export type PhiCmsSplitCardLayoutConfig = PhiCmsLayerBase & {
  gap?: CSSProperties["gap"];
  effect?: PhiLayoutEffectId;
  leftPadding?: CSSProperties["padding"];
  rightPadding?: CSSProperties["padding"];
  leftBackground?: PhiCmsBackgroundWidgetConfig;
  rightBackground?: PhiCmsBackgroundWidgetConfig;
  leftBorder?: PhiCmsBorderWidgetConfig;
  rightBorder?: PhiCmsBorderWidgetConfig;
  leftShadow?: PhiShadow;
  rightShadow?: PhiShadow;
};

export type PhiCmsMasonryLayoutConfig = PhiCmsLayerBase & {
  columns?: number;
  minColumnWidth?: PhiCssLength;
  gap?: CSSProperties["gap"];
  itemPadding?: CSSProperties["padding"];
  itemBackground?: string;
  itemBorder?: string;
  itemBorderRadius?: CSSProperties["borderRadius"];
  itemShadow?: PhiShadow;
};

function readRenderableBlockAnchorOrPlacement(value: unknown): PhiRenderableBlockAnchor | undefined {
  const normalized = normalizeRenderableBlockAnchor(value);
  if (normalized) {
    return normalized;
  }

  return typeof value === "string" && isPhiAnchorWidgetPlacement(value)
    ? resolvePhiRenderableBlockAnchor(value)
    : undefined;
}

export function readPhiCmsBorderWidgetConfig(value: unknown): PhiCmsBorderWidgetConfig | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const border = readString(value);
    if (border == null) {
      return undefined;
    }

    if (border === "none") {
      return {
        borderStyle: "none",
      };
    }

    const match = border.match(/^([0-9.]+)px\s+([a-z-]+)\s+(.+)$/i);
    if (!match) {
      return undefined;
    }

    const borderWidth = Number.parseFloat(match[1]);
    const borderStyle = match[2] as PhiCmsBorderWidgetConfig["borderStyle"];
    const borderColor = match[3]?.trim();

    return {
      ...(Number.isFinite(borderWidth) ? { borderWidth } : {}),
      ...(borderStyle == null ? {} : { borderStyle }),
      ...(borderColor ? { borderColor } : {}),
    };
  }

  const raw = value as Record<string, unknown>;
  const next: PhiCmsBorderWidgetConfig = {
    borderWidth: readNumber(raw.borderWidth),
    borderStyle:
      typeof raw.borderStyle === "string" && raw.borderStyle.trim().length > 0
        ? (raw.borderStyle as PhiCmsBorderWidgetConfig["borderStyle"])
        : undefined,
    borderColor: readString(raw.borderColor),
    borderTopLeftRadius: readCssSize(raw.borderTopLeftRadius),
    borderTopRightRadius: readCssSize(raw.borderTopRightRadius),
    borderBottomLeftRadius: readCssSize(raw.borderBottomLeftRadius),
    borderBottomRightRadius: readCssSize(raw.borderBottomRightRadius),
  };

  return Object.values(next).some((entry) => entry != null) ? next : undefined;
}

function readGridResponsivePlacement(
  value: unknown,
  minimum: number,
  maximum: number,
): PhiResponsiveValue<number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const read = (key: "compact" | "medium" | "wide") => {
    const candidate = readNumber(record[key]);
    return Number.isInteger(candidate) && candidate != null && candidate >= minimum && candidate <= maximum
      ? candidate
      : undefined;
  };
  const responsive = { compact: read("compact"), medium: read("medium"), wide: read("wide") };
  return responsive.compact != null || responsive.medium != null || responsive.wide != null
    ? responsive
    : undefined;
}

function readGridSlotPlacement(value: unknown, slotIndexFromArray?: number): PhiCmsGridLayoutSlotPlacementConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const slot = value as Record<string, unknown>;
  const slotIndex = readNumber(slot.slotIndex) ?? slotIndexFromArray;
  if (!Number.isInteger(slotIndex) || slotIndex == null || slotIndex < 0) {
    return null;
  }

  const span = readGridResponsivePlacement(slot.span, 1, 24);
  const offset = readGridResponsivePlacement(slot.offset, 0, 23);
  if (!span && !offset) return null;
  const resolvedSpan = {
    compact: span?.compact ?? 6,
    medium: span?.medium ?? span?.compact ?? 6,
    wide: span?.wide ?? span?.medium ?? span?.compact ?? 6,
  };
  const resolvedOffset = {
    compact: offset?.compact ?? 0,
    medium: offset?.medium ?? offset?.compact ?? 0,
    wide: offset?.wide ?? offset?.medium ?? offset?.compact ?? 0,
  };
  for (const profile of ["compact", "medium", "wide"] as const) {
    if (resolvedOffset[profile] + resolvedSpan[profile] > 24) {
      throw new Error(`Grid slot ${slotIndex} ${profile} offset plus span exceeds 24.`);
    }
  }
  return { slotIndex, span, offset };
}

export function parsePhiCmsContentLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsContentLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      size: readRenderableBlockSize(config.size) ?? {
        width: readCssSize(config.width),
        height: readCssSize(config.height),
      },
      margin: readCssSize(config.margin),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      anchor: resolvePhiAnchorPlacement(readRenderableBlockAnchorOrPlacement(config.anchor)) ?? undefined,
    },
    resolvePhiLayoutDefaults("content"),
  );
}


export function parsePhiCmsFormLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsFormLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...parsePhiCmsContentLayoutConfig(config),
    },
    resolvePhiLayoutDefaults("form"),
  );
}


export function parsePhiCmsFlexLayoutConfig(config: Record<string, unknown>): PhiCmsFlexLayoutConfig {
  const distribution = readString(config.distribution);

  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      initialSlotStates: readInitialSlotStates(config.initialSlotStates),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      gap: readCssSize(config.gap),
      verticalSeparators: readBoolean(config.verticalSeparators) ?? false,
      separatorBeforeFirst: readBoolean(config.separatorBeforeFirst) ?? false,
      separatorSpan: readPhiLengthValue(config.separatorSpan) ?? undefined,
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
      distribution:
        distribution === "between" || distribution === "around" || distribution === "evenly"
          ? distribution
          : "anchor",
      wrap:
        readBoolean(config.wrap) ??
        (readString(config.wrap) as CSSProperties["flexWrap"] | undefined) ??
        false,
    },
    resolvePhiLayoutDefaults("flex"),
  );
}


export function parsePhiCmsFlexVerticalLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsFlexVerticalLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      initialSlotStates: readInitialSlotStates(config.initialSlotStates),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      gap: readCssSize(config.gap),
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
    },
    resolvePhiLayoutDefaults("verticalflex"),
  );
}


export function parsePhiCmsMasonryLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsMasonryLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      padding: readCssSize(config.padding),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      columns: readNumber(config.columns),
      minColumnWidth: readPhiLengthValue(config.minColumnWidth) ?? undefined,
      gap: readCssSize(config.gap),
      itemPadding: readCssSize(config.itemPadding),
      itemBackground: readString(config.itemBackground),
      itemBorder: readString(config.itemBorder),
      itemBorderRadius: readCssSize(config.itemBorderRadius),
      itemShadow: readPhiShadow(config.itemShadow),
    },
    resolvePhiLayoutDefaults("masonry"),
  );
}

export function parsePhiCmsStackLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsStackLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      padding: readCssSize(config.padding),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      activeSlotKey: readString(config.activeSlotKey),
      defaultActiveSlotKey: readString(config.defaultActiveSlotKey),
      mountPolicy: config.mountPolicy === "keep" ? "keep" : "active",
      slotTransition: config.slotTransition === "fade-over" ? "fade-over" : "none",
    },
    resolvePhiLayoutDefaults("stack"),
  );
}

function readCollapsibleTrigger(value: unknown): PhiCmsCollapsibleLayoutConfig["collapsible"] {
  return value === "header" || value === "icon" || value === "disabled" ? value : undefined;
}

function readCollapsibleSize(value: unknown): PhiCmsCollapsibleLayoutConfig["collapseSize"] {
  return readPhiControlSize(value);
}

function readExpandIconPlacement(value: unknown): PhiCmsCollapsibleLayoutConfig["expandIconPlacement"] {
  return value === "start" || value === "end" ? value : undefined;
}

function readSlotTitles(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const titles = value.map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""));
  while (titles.length > 0 && !titles[titles.length - 1]) {
    titles.pop();
  }

  return titles.length > 0 ? titles : undefined;
}

export function parsePhiCmsCollapsibleLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsCollapsibleLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      initialSlotStates: readInitialSlotStates(config.initialSlotStates),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
      panelMinHeight: readPhiLengthValue(config.panelMinHeight) ?? undefined,
      accordion: readBoolean(config.accordion),
      slotTitles: readSlotTitles(config.slotTitles),
      translateSlotTitles: readBoolean(config.translateSlotTitles),
      defaultOpenSlotKeys: readStringArray(config.defaultOpenSlotKeys),
      collapsible: readCollapsibleTrigger(config.collapsible),
      bordered: readBoolean(config.bordered),
      ghost: readBoolean(config.ghost),
      expandIconPlacement: readExpandIconPlacement(config.expandIconPlacement),
      collapseSize: readCollapsibleSize(config.collapseSize),
      titleStrong: readBoolean(config.titleStrong),
      headerPadding: readCssSize(config.headerPadding),
      innerPadding: readCssSize(config.innerPadding),
    },
    resolvePhiLayoutDefaults("collapsible"),
  );
}


export function parsePhiCmsGridLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsGridLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      padding: readCssSize(config.padding),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      gap: readCssSize(config.gap),
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
      columnGap: readCssSize(config.columnGap),
      align: readString(config.align) as CSSProperties["alignItems"] | undefined,
      justify: readString(config.justify) as CSSProperties["justifyContent"] | undefined,
      wrap:
        readBoolean(config.wrap) ??
        (readString(config.wrap) as CSSProperties["flexWrap"] | undefined) ??
        false,
      slotPlacements: Array.isArray(config.slotPlacements)
        ? config.slotPlacements
            .map((slot, slotIndex) => readGridSlotPlacement(slot, slotIndex))
            .filter((slot): slot is PhiCmsGridLayoutSlotPlacementConfig => slot !== null)
        : undefined,
      slotBackground: readString(config.slotBackground),
      slotBorder: readString(config.slotBorder),
      slotBorderRadius: readCssSize(config.slotBorderRadius),
      slotShadow: readPhiShadow(config.slotShadow),
    },
    resolvePhiLayoutDefaults("grid"),
  );
}



export function parsePhiCmsThreeColumnLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsThreeColumnLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      balancedSides: readBoolean(config.balancedSides) ?? true,
      gap: readCssSize(config.gap),
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
      align: readString(config.align) as CSSProperties["alignItems"] | undefined,
      justify: readString(config.justify) as CSSProperties["justifyContent"] | undefined,
      wrap:
        readBoolean(config.wrap) ??
        (readString(config.wrap) as CSSProperties["flexWrap"] | undefined) ??
        false,
      leftWidth: readPhiLengthValue(config.leftWidth) ?? undefined,
      middleWidth: readPhiLengthValue(config.middleWidth) ?? undefined,
      rightWidth: readPhiLengthValue(config.rightWidth) ?? undefined,
      contentAlign: readString(config.contentAlign) as CSSProperties["alignItems"] | undefined,
    },
    resolvePhiLayoutDefaults("threecol"),
  );
}


export function parsePhiCmsSplitCardLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsSplitCardLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      gap: readCssSize(config.gap),
      padding: readCssSize(config.padding),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      background: readString(config.background),
      border: readString(config.border),
      borderRadius: readCssSize(config.borderRadius),
      effect: isPhiLayoutEffectId(config.effect) ? config.effect : undefined,
      shadow: readPhiShadow(config.shadow),
      leftPadding: readCssSize(config.leftPadding),
      rightPadding: readCssSize(config.rightPadding),
      leftBackground: normalizePhiBackgroundWidgetConfig(config.leftBackground),
      rightBackground: normalizePhiBackgroundWidgetConfig(config.rightBackground),
      leftBorder: readPhiCmsBorderWidgetConfig(config.leftBorder),
      rightBorder: readPhiCmsBorderWidgetConfig(config.rightBorder),
      leftShadow: readPhiShadow(config.leftShadow),
      rightShadow: readPhiShadow(config.rightShadow),
    },
    resolvePhiLayoutDefaults("split"),
  );
}
