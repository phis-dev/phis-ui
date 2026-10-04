import type { CSSProperties } from "react";
import { readPhiControlSize, type PhiControlSize } from "./control";
import { readPhiCmsMountPolicy, type PhiCmsMountPolicy } from "./cms-mount-policy";
import {
  clampPhiSequenceTransitionMs,
  readPhiMotionEasing,
  type PhiMotionEasing,
  PHI_SEQUENCE_ANCHORS,
  PHI_SEQUENCE_TRANSITIONS,
  type PhiSequenceAnchor,
  type PhiSequenceTransition,
} from "../helpers/motion";
import { readPhiLengthValue, type PhiCssLength } from "./length";
import type { PhiResponsiveValue } from "./responsive";

import {
  isPhiAnchorWidgetPlacement,
  resolvePhiRenderableBlockAnchor,
} from "../components/controls/phi-anchor-control-contract";
import {
  readBoolean,
  readCssSize,
  readNumber,
  readRenderableBlockConfig,
  readRenderableBlockSize,
  readString,
} from "../components/widgets/config/parser-primitives";
import type {
  PhiRenderableBlockBase,
  PhiRenderableBlockAnchor,
  PhiRenderableBlockResponsiveSize,
} from "./renderable-block";
import type { PhiBaseLayoutSlotStates } from "../components/layouts/phi-layout-contract";
import { applyPhiLayoutDefaults } from "../helpers/cms-layout-defaults";
import { resolvePhiLayoutDefaults } from "../helpers/cms-layout-defaults";
import { normalizeRenderableBlockAnchor } from "../helpers/renderable-block-anchor";
import { isPhiRecord } from "../helpers/is-record";
import { PHI_GRID_COLUMN_COUNTS, isPhiGridColumnCount } from "../components/layouts/phi-grid-contract";

export type PhiCmsPluginConfigBase = Record<string, unknown>;

// CMS configs are sparse override shapes.
// Parsers normalize them back to the full runtime contract and fill in defaults.
export type PhiCmsRenderableBlockConfigBase = PhiCmsPluginConfigBase & PhiRenderableBlockBase;

// Layout configs add shared composition chrome on top of the renderable block base.
export type PhiCmsLayerBase = PhiCmsRenderableBlockConfigBase & {
  initialSlotStates?: PhiBaseLayoutSlotStates;
  /**
   * The grid line the label column of anything inside this Layout ends at, on the 24-track form grid
   * (LAYOUTING.md, "Form grid"). Line 7 is a quarter of the width.
   *
   * Shared like padding and background rather than the property of one Layout kind, because any Layout
   * can be the one a form or a panel of labelled Controls stands in. It was a kind of its own once --
   * a content Layout with this single extra number -- which bought nothing and cost a second meaning
   * for the word "form", the Widget already being called that.
   */
  labelEnd?: number;
  padding?: CSSProperties["padding"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingBottom?: CSSProperties["paddingBottom"];
  paddingLeft?: CSSProperties["paddingLeft"];
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
    ...(isPhiRecord(defaults) ? defaults : {}),
  };

  if (isPhiRecord(override)) {
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
  size?: PhiRenderableBlockResponsiveSize;
  margin?: CSSProperties["margin"];
  anchor?: PhiRenderableBlockAnchor;
  padding?: CSSProperties["padding"];
  paddingLeft?: CSSProperties["paddingLeft"];
  paddingRight?: CSSProperties["paddingRight"];
  paddingTop?: CSSProperties["paddingTop"];
  paddingBottom?: CSSProperties["paddingBottom"];
};

/**
 * The one thing a form container states that a content container does not: how wide the labels are.
 *
 * Every labelled Control already draws itself as label beside input; what it cannot know is how wide
 * the column is next to the Control above it. The form layout says it once for everything inside,
 * through the same CSS variable the media inspector uses, and that is what turns a stack of labelled
 * Controls into a two-column form.
 */
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
  /**
   * The slot the sequence stands on when nothing has moved it yet.
   *
   * It is a starting position and not a steering wheel: a signal, a pager Widget or the Builder's
   * arrows move the sequence from here, and what they set outlives a later change to this value.
   * Steering happens on the `activeSlotKey` and `activeSlotIndex` channels, which is a different
   * thing that happens to share a word.
   */
  defaultActiveSlotKey?: string;
  /**
   * Whether the box holds one slot at a time or all of them at once.
   *
   * `stacked` draws every slot in the same box, one over the next, in slot order. The settings that
   * pick a single slot -- the starting one, the mount policy, the transition -- describe nothing then,
   * and the layout stops reading them.
   */
  slotDisplay?: "single" | "stacked";
  mountPolicy?: PhiCmsMountPolicy;
  slotTransition?: "none" | "fade-over";
  slotTransitionDurationMs?: number;
  slotTransitionEasing?: PhiMotionEasing;
};

export type PhiCmsCarouselLayoutConfig = PhiCmsLayerBase & {
  /** The slot the sequence starts on. See the Stack's, which it works exactly like. */
  defaultActiveSlotKey?: string;
  /** How many slots stand in the window at once. The Stack's window is always one; this one is not. */
  visibleSlots?: number;
  /** Which end of the window the index means, once the window is wider than a slot. */
  windowAnchor?: PhiSequenceAnchor;
  transition?: PhiSequenceTransition;
  transitionDurationMs?: number;
  transitionEasing?: PhiMotionEasing;
  slotGap?: string;
  /** Which of its own controls the Carousel draws. Pager Widgets work regardless of this. */
  controls?: "none" | "arrows" | "dots" | "both";
  loop?: boolean;
  /** Absent or zero means it does not move on its own. */
  autoplayMs?: number;
  /** How many slots beyond the window stay mounted, and so how far ahead their content is ready. */
  lookahead?: number;
};

export type PhiCmsCollapsibleLayoutConfig = PhiCmsLayerBase & {
  anchor?: PhiRenderableBlockAnchor;
  panelMinHeight?: PhiCssLength;
  accordion?: boolean;
  slotTitles?: string[];
  translateSlotTitles?: boolean;
  defaultOpenSlotKeys?: string[];
  collapsible?: "header" | "icon" | "disabled";
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

/**
 * A Grid: how many slots a row holds at each width, and the slots that are wider or indented.
 *
 * `gap` is the distance between slots, across and down; `anchor` places each slot's content in its
 * cell (LAYOUTING.md, "Grid slot placement").
 */
export type PhiCmsGridLayoutConfig = PhiCmsLayerBase & {
  gap?: CSSProperties["gap"];
  anchor?: PhiRenderableBlockAnchor;
  columns?: PhiResponsiveValue<number>;
  slotPlacements?: PhiCmsGridLayoutSlotPlacementConfig[];
};

export type PhiCmsThreeColumnLayoutConfig = PhiCmsDirectionalLayoutConfigBase & {
  balancedSides?: boolean;
  leftWidth?: PhiCssLength;
  middleWidth?: PhiCssLength;
  rightWidth?: PhiCssLength;
  contentAlign?: CSSProperties["alignItems"];
};

/**
 * Two cards on the golden ratio. The Layout's Surface is the cards' -- each half draws its edge, corner,
 * depth and pane -- and its Background runs once across both and shows only inside them. What stands in
 * a half sets its own inset; a half has none of its own.
 */
export type PhiCmsSplitCardLayoutConfig = PhiCmsLayerBase & {
  gap?: CSSProperties["gap"];
  /** The golden ratio the other way round: the left card the larger one. */
  swapRatio?: boolean;
};

/** Children in columns at their own heights: how many columns at each width, and the gap between them. */
export type PhiCmsMasonryLayoutConfig = PhiCmsLayerBase & {
  columns?: PhiResponsiveValue<number>;
  gap?: CSSProperties["gap"];
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

function readGridResponsiveCount(
  value: unknown,
  accepts: (candidate: number) => boolean,
): PhiResponsiveValue<number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const read = (key: "compact" | "medium" | "wide") => {
    const candidate = readNumber(record[key]);
    return candidate != null && Number.isInteger(candidate) && accepts(candidate) ? candidate : undefined;
  };
  const responsive = { compact: read("compact"), medium: read("medium"), wide: read("wide") };
  return responsive.compact != null || responsive.medium != null || responsive.wide != null
    ? responsive
    : undefined;
}

const PHI_GRID_MAX_COLUMNS = Math.max(...PHI_GRID_COLUMN_COUNTS);

/*
 * Counted in the Grid's columns, so a span is at most the widest row and an indent one less. Whether
 * they fit the row at a given width is answered where the row is known, by clamping
 * (`resolvePhiGridSlotPlacement`): a Grid whose columns were reduced keeps its stated placements.
 */
function readGridSlotPlacement(value: unknown, slotIndexFromArray?: number): PhiCmsGridLayoutSlotPlacementConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const slot = value as Record<string, unknown>;
  const slotIndex = readNumber(slot.slotIndex) ?? slotIndexFromArray;
  if (!Number.isInteger(slotIndex) || slotIndex == null || slotIndex < 0) {
    return null;
  }

  const span = readGridResponsiveCount(slot.span, (candidate) => candidate >= 1 && candidate <= PHI_GRID_MAX_COLUMNS);
  const offset = readGridResponsiveCount(slot.offset, (candidate) => candidate >= 0 && candidate < PHI_GRID_MAX_COLUMNS);
  if (!span && !offset) return null;
  return { slotIndex, span, offset };
}

/**
 * A shared Layout field, read the same way wherever it appears: a line on the 24-track form grid, so
 * anything outside 2..24 is not a narrower column but a mistake, and is dropped rather than clamped.
 */
export function readPhiLayoutLabelEnd(value: unknown): number | undefined {
  const labelEnd = readNumber(value);
  return labelEnd !== undefined && Number.isInteger(labelEnd) && labelEnd >= 2 && labelEnd <= 24
    ? labelEnd
    : undefined;
}

export function parsePhiCmsContentLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsContentLayoutConfig {
  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      /*
       * Geometry is read from `size` alone. A config saying `width` was read here as well, which gave
       * a Module two ways to say one thing and the reader two places to look; flat `width` and its
       * siblings are what a block turns into on its way to CSS, not something a preset writes. The
       * constraints never had the second way at all -- nothing has ever read a flat `maxWidth`.
       */
      size: readRenderableBlockSize(config.size),
      margin: readCssSize(config.margin),
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      /*
       * Handed on as the block anchor, like every other Layout's. This one used to be folded into a
       * placement name here, and the renderer then asked the name for its `horizontal` -- a string has
       * none, so a Content Layout anchored left drew centred wherever the parsed config reached it, in
       * preview and live, while the Builder, which hands the object straight through, drew it left.
       */
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
    },
    resolvePhiLayoutDefaults("content"),
  );
}


export function parsePhiCmsFlexLayoutConfig(config: Record<string, unknown>): PhiCmsFlexLayoutConfig {
  const distribution = readString(config.distribution);

  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      initialSlotStates: readInitialSlotStates(config.initialSlotStates),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
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
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      initialSlotStates: readInitialSlotStates(config.initialSlotStates),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
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
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      columns: readGridResponsiveCount(config.columns, isPhiGridColumnCount),
      gap: readCssSize(config.gap),
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
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      padding: readCssSize(config.padding),
      defaultActiveSlotKey: readString(config.defaultActiveSlotKey),
      slotDisplay: config.slotDisplay === "stacked" ? "stacked" : "single",
      mountPolicy: readPhiCmsMountPolicy(config.mountPolicy, "remount"),
      slotTransition: config.slotTransition === "fade-over" ? "fade-over" : "none",
      // Absent means "whatever the theme does", which is why the fallback is read from the token
      // rather than written here as a number.
      ...(config.slotTransitionDurationMs === undefined ? {} : {
        slotTransitionDurationMs: clampPhiSequenceTransitionMs(config.slotTransitionDurationMs),
      }),
      ...(config.slotTransitionEasing === undefined ? {} : {
        slotTransitionEasing: readPhiMotionEasing(config.slotTransitionEasing, undefined),
      }),
    },
    resolvePhiLayoutDefaults("stack"),
  );
}

/*
 * Read strictly, and say so when a document is wrong.
 *
 * A Carousel whose stored transition is a word nobody knows is a mistake in the document, and a
 * layout that quietly picks something else hides it: the page renders, no error is reported, and the
 * slots simply move in a way nobody wrote. Absent is not wrong -- a key that was never written falls
 * to the layout's defaults, which is a decision rather than a rescue.
 */
function failCarousel(key: string, value: unknown, expected: string): never {
  throw new Error(`Invalid Carousel ${key} ${JSON.stringify(value)}. Expected ${expected}.`);
}

function readCarouselMember<TMember extends string>(
  value: unknown,
  members: readonly TMember[],
  key: string,
): TMember | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !(members as readonly string[]).includes(value)) {
    failCarousel(key, value, `one of ${members.join(", ")}`);
  }
  return value as TMember;
}

function readCarouselCount(value: unknown, key: string, min: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    failCarousel(key, value, `a whole number of at least ${min}`);
  }
  return value;
}

function readCarouselFlag(value: unknown, key: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") failCarousel(key, value, "true or false");
  return value;
}

export function parsePhiCmsCarouselLayoutConfig(
  config: Record<string, unknown>,
): PhiCmsCarouselLayoutConfig {
  const visibleSlots = readCarouselCount(config.visibleSlots, "visibleSlots", 1);
  const windowAnchor = readCarouselMember(config.windowAnchor, PHI_SEQUENCE_ANCHORS, "windowAnchor");
  const transition = readCarouselMember(config.transition, PHI_SEQUENCE_TRANSITIONS, "transition");
  const controls = readCarouselMember(config.controls, ["none", "arrows", "dots", "both"] as const, "controls");
  const loop = readCarouselFlag(config.loop, "loop");
  const autoplayMs = readCarouselCount(config.autoplayMs, "autoplayMs", 0);
  const lookahead = readCarouselCount(config.lookahead, "lookahead", 0);

  return applyPhiLayoutDefaults(
    {
      ...readRenderableBlockConfig(config),
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      padding: readCssSize(config.padding),
      defaultActiveSlotKey: readString(config.defaultActiveSlotKey),
      ...(visibleSlots === undefined ? {} : { visibleSlots }),
      ...(windowAnchor === undefined ? {} : { windowAnchor }),
      ...(transition === undefined ? {} : { transition }),
      // Absent means "whatever the theme does", which is why nothing is written here rather than a
      // number this parser invented.
      ...(config.transitionDurationMs === undefined || config.transitionDurationMs === null ? {} : {
        transitionDurationMs: clampPhiSequenceTransitionMs(config.transitionDurationMs),
      }),
      ...(config.transitionEasing === undefined ? {} : {
        transitionEasing: readPhiMotionEasing(config.transitionEasing, undefined),
      }),
      slotGap: readString(config.slotGap),
      ...(controls === undefined ? {} : { controls }),
      ...(loop === undefined ? {} : { loop }),
      // Zero is how "does not move on its own" is written, so it is the one number below the floor
      // that means something.
      ...(autoplayMs === undefined || autoplayMs === 0
        ? {}
        : { autoplayMs: clampPhiSequenceTransitionMs(autoplayMs) }),
      ...(lookahead === undefined ? {} : { lookahead }),
    },
    resolvePhiLayoutDefaults("carousel"),
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
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      initialSlotStates: readInitialSlotStates(config.initialSlotStates),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
      panelMinHeight: readPhiLengthValue(config.panelMinHeight) ?? undefined,
      accordion: readBoolean(config.accordion),
      slotTitles: readSlotTitles(config.slotTitles),
      translateSlotTitles: readBoolean(config.translateSlotTitles),
      defaultOpenSlotKeys: readStringArray(config.defaultOpenSlotKeys),
      collapsible: readCollapsibleTrigger(config.collapsible),
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
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
      gap: readCssSize(config.gap),
      anchor: readRenderableBlockAnchorOrPlacement(config.anchor),
      columns: readGridResponsiveCount(config.columns, isPhiGridColumnCount),
      slotPlacements: Array.isArray(config.slotPlacements)
        ? config.slotPlacements
            .map((slot, slotIndex) => readGridSlotPlacement(slot, slotIndex))
            .filter((slot): slot is PhiCmsGridLayoutSlotPlacementConfig => slot !== null)
        : undefined,
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
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      padding: readCssSize(config.padding),
      paddingLeft: readCssSize(config.paddingLeft),
      paddingRight: readCssSize(config.paddingRight),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
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
      labelEnd: readPhiLayoutLabelEnd(config.labelEnd),
      gap: readCssSize(config.gap),
      swapRatio: readBoolean(config.swapRatio),
      padding: readCssSize(config.padding),
      paddingTop: readCssSize(config.paddingTop),
      paddingBottom: readCssSize(config.paddingBottom),
    },
    resolvePhiLayoutDefaults("split"),
  );
}
