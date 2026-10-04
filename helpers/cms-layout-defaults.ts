import { PHI_SPACE } from "../theme/antd-css-var-contract";
import type { PhiLayoutKind } from "../components/layouts/phi-layout-contract";
import { PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR } from "./renderable-block-defaults";
import { isPhiRecord } from "./is-record";
import { PHI_SURFACE_CARD } from "./surface-presets";
import { PHI_GRID_LAYOUT_DEFAULT_COLUMNS } from "../components/layouts/phi-grid-contract";
import { PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS } from "../components/layouts/phi-masonry-contract";

type JsonRecord = Record<string, unknown>;

export type PhiLayoutDefaults = JsonRecord;
export type PhiLayoutCreationPreset = "panel" | "overlay-actions" | "page-base";

/*
 * What a Layout states when its node states nothing.
 *
 * Every gap is the small step (`sm`): one rhythm between children, whatever arranges them. The padding
 * follows what the Layout is for. A Layout that only arranges its children -- Content, Flex, the
 * vertical Flex, Stack, Carousel, Collapsible, Split Card -- has none, so nesting one in another adds
 * nothing. A Layout that shows a field of tiles -- Grid, Masonry -- keeps them off its edge by the base
 * step; a Three-column row runs edge to edge and keeps its sides off the edge. A Region has no padding
 * at all: a gap between a Region's edge and its root Layout is something an author sets.
 *
 * "None" in the Paddings panel writes 0 rather than clearing the key, so a default is switched off for
 * good. A side stated on its own wins over the uniform padding: a Three-column row loses its sides by
 * setting each to none.
 */

export const PHI_CONTENT_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    margin: 0,
};
const PHI_CONTENT_LAYOUT_PANEL_PRESET = {
    margin: 0,
    padding: PHI_SPACE.base,
} as const;

export const PHI_FLEX_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    distribution: "anchor",
    // A fresh row starts left-aligned and vertically centred, its children one small step apart.
    anchor: { horizontal: "left", vertical: "middle" },
    gap: PHI_SPACE.sm,
    verticalSeparators: false,
    separatorBeforeFirst: false,
    separatorSpan: "75%",
    wrap: false,
};
const PHI_FLEX_LAYOUT_PANEL_PRESET = {
    distribution: "anchor",
    gap: PHI_SPACE.sm,
    verticalSeparators: false,
    separatorBeforeFirst: false,
    separatorSpan: "75%",
    wrap: false,
    paddingTop: 0,
    paddingRight: PHI_SPACE.base,
    paddingBottom: 0,
    paddingLeft: PHI_SPACE.base,
} as const;
const PHI_FLEX_LAYOUT_OVERLAY_ACTIONS_PRESET = {
    distribution: "anchor",
    anchor: { horizontal: "right", vertical: "middle" },
    gap: PHI_SPACE.xs,
    verticalSeparators: false,
    separatorBeforeFirst: false,
    separatorSpan: "75%",
    wrap: true,
    paddingTop: PHI_SPACE.xs,
    paddingRight: PHI_SPACE.base,
    paddingBottom: PHI_SPACE.xs,
    paddingLeft: PHI_SPACE.base,
    width: "100%",
} as const;

export const PHI_FLEX_VERTICAL_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    gap: PHI_SPACE.sm,
};
const PHI_FLEX_VERTICAL_LAYOUT_PANEL_PRESET = {
    gap: PHI_SPACE.sm,
    padding: PHI_SPACE.base,
} as const;
/**
 * The one content-region scaffold every built-in page preset roots on. Byte-identical wherever it
 * appears: a page that needs different chrome puts its own Layout node inside a slot instead of
 * touching this config -- the preset tree contract rejects a deviating copy.
 */
const PHI_FLEX_VERTICAL_LAYOUT_PAGE_BASE_PRESET = {
    gap: PHI_SPACE.sm,
    padding: PHI_SPACE.base,
    /*
     * No Surface, so whatever the theme paints behind the page -- a colour, an image, the frosted
     * Chrome pane -- reaches the content region instead of stopping at a grey plate. A page that
     * wants its own ground paints it on a Layout node inside a slot.
     */
    width: "100%",
} as const;

export const PHI_GRID_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    gap: PHI_SPACE.sm,
    padding: PHI_SPACE.base,
    columns: { ...PHI_GRID_LAYOUT_DEFAULT_COLUMNS },
};
const PHI_GRID_LAYOUT_PANEL_PRESET = {
    gap: PHI_SPACE.sm,
    padding: PHI_SPACE.base,
} as const;

export const PHI_MASONRY_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    columns: { ...PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS },
    gap: PHI_SPACE.sm,
    padding: PHI_SPACE.base,
};
const PHI_MASONRY_LAYOUT_PANEL_PRESET = {
    columns: { ...PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS },
    gap: PHI_SPACE.sm,
    padding: PHI_SPACE.base,
} as const;

export const PHI_STACK_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    // One slot at a time is what a Stack is until somebody says otherwise; the pile is the deliberate
    // choice, not the standing one.
    slotDisplay: "single",
    slotTransition: "none",
    /*
     * Stated here although the parser resolves the same word on its own, because these defaults are
     * what the Inspector shows as the standing answer. Left absent, the select stood empty over a
     * setting that was never in doubt.
     */
    mountPolicy: "remount",
};
const PHI_STACK_LAYOUT_PANEL_PRESET = {
    padding: PHI_SPACE.base,
} as const;

export const PHI_CAROUSEL_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    // A slide is what tells somebody the slots are a run rather than a set, so it is the opening
    // impression rather than a preference to be discovered. Everything else is left absent: the
    // duration then follows the theme, and the window shows one slot until somebody widens it.
    transition: "slide",
    visibleSlots: 1,
    windowAnchor: "start",
    /*
     * Arrows, not dots, and not both.
     *
     * A Carousel's slots are authored blocks rather than pictures: there are a handful of them, not
     * thirty, so a row of dots buys little and costs a strip of vertical space under content that
     * was laid out to fill its box. Arrows sit over the slots and take none. Both are one setting
     * away either way.
     */
    controls: "arrows",
    loop: false,
};
const PHI_CAROUSEL_LAYOUT_PANEL_PRESET = {
    padding: PHI_SPACE.base,
} as const;

export const PHI_COLLAPSIBLE_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    anchor: PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR,
    accordion: false,
    slotTitles: [],
    translateSlotTitles: true,
    defaultOpenSlotKeys: ["slot_0"],
    collapsible: "header",
    ghost: true,
    expandIconPlacement: "start",
    collapseSize: "medium",
    titleStrong: true,
    headerPadding: PHI_SPACE.sm,
    innerPadding: PHI_SPACE.base,
};
const PHI_COLLAPSIBLE_LAYOUT_PANEL_PRESET = {
    anchor: PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR,
    accordion: false,
    slotTitles: [],
    translateSlotTitles: true,
    defaultOpenSlotKeys: ["slot_0"],
    collapsible: "header",
    ghost: false,
    expandIconPlacement: "start",
    collapseSize: "medium",
    titleStrong: true,
    headerPadding: PHI_SPACE.sm,
    innerPadding: PHI_SPACE.base,
    padding: PHI_SPACE.base,
} as const;

/** A split card centres what stands in its cards, on both axes, unless it says otherwise. */
const PHI_SPLIT_CARD_LAYOUT_DEFAULT_ANCHOR = { horizontal: "center", vertical: "middle" } as const;
/*
 * The two cards stand the small step apart. Their padding -- the distance from a card's edge to what
 * stands in it, as every Layout's padding is the distance from its own edge to its slots -- is none
 * until somebody states one.
 */
export const PHI_SPLIT_CARD_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    anchor: PHI_SPLIT_CARD_LAYOUT_DEFAULT_ANCHOR,
    gap: PHI_SPACE.sm,
};

/*
 * What a Split Card is created with: spaced, and its two halves drawn as cards. The Surface is the
 * creation's and not a default -- a default is put back under a node that states nothing, and a Split
 * Card whose author took the cards away would have them back on the next render.
 */
export const PHI_SPLIT_CARD_LAYOUT_CREATION_CONFIG = {
    ...PHI_SPLIT_CARD_LAYOUT_DEFAULTS,
    surface: PHI_SURFACE_CARD,
} as const;

const PHI_SPLIT_CARD_LAYOUT_PANEL_PRESET = PHI_SPLIT_CARD_LAYOUT_CREATION_CONFIG;

export const PHI_THREE_COLUMN_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    balancedSides: true,
    gap: PHI_SPACE.sm,
    wrap: false,
    paddingLeft: PHI_SPACE.base,
    paddingRight: PHI_SPACE.base,
};
const PHI_THREE_COLUMN_LAYOUT_PANEL_PRESET = {
    balancedSides: true,
    gap: PHI_SPACE.sm,
    wrap: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: PHI_SPACE.base,
    paddingRight: PHI_SPACE.base,
} as const;

const PHI_LAYOUT_DEFAULTS_BY_KIND: Record<PhiLayoutKind, PhiLayoutDefaults> = {
  content: PHI_CONTENT_LAYOUT_DEFAULTS,
  flex: PHI_FLEX_LAYOUT_DEFAULTS,
  stack: PHI_STACK_LAYOUT_DEFAULTS,
  carousel: PHI_CAROUSEL_LAYOUT_DEFAULTS,
  grid: PHI_GRID_LAYOUT_DEFAULTS,
  split: PHI_SPLIT_CARD_LAYOUT_DEFAULTS,
  threecol: PHI_THREE_COLUMN_LAYOUT_DEFAULTS,
  masonry: PHI_MASONRY_LAYOUT_DEFAULTS,
  verticalflex: PHI_FLEX_VERTICAL_LAYOUT_DEFAULTS,
  collapsible: PHI_COLLAPSIBLE_LAYOUT_DEFAULTS,
};

function isSameValue(left: unknown, right: unknown) {
  if (Object.is(left, right)) {
    return true;
  }

  if (!isPhiRecord(left) || !isPhiRecord(right)) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

export function resolvePhiLayoutDefaults(
  layoutKind: PhiLayoutKind,
): JsonRecord {
  return PHI_LAYOUT_DEFAULTS_BY_KIND[layoutKind];
}

const PHI_LAYOUT_PANEL_PRESETS_BY_KIND: Record<PhiLayoutKind, JsonRecord> = {
  content: PHI_CONTENT_LAYOUT_PANEL_PRESET,
  flex: PHI_FLEX_LAYOUT_PANEL_PRESET,
  stack: PHI_STACK_LAYOUT_PANEL_PRESET,
  carousel: PHI_CAROUSEL_LAYOUT_PANEL_PRESET,
  grid: PHI_GRID_LAYOUT_PANEL_PRESET,
  split: PHI_SPLIT_CARD_LAYOUT_PANEL_PRESET,
  threecol: PHI_THREE_COLUMN_LAYOUT_PANEL_PRESET,
  masonry: PHI_MASONRY_LAYOUT_PANEL_PRESET,
  verticalflex: PHI_FLEX_VERTICAL_LAYOUT_PANEL_PRESET,
  collapsible: PHI_COLLAPSIBLE_LAYOUT_PANEL_PRESET,
};

export function resolvePhiLayoutCreationPreset(
  layoutKind: PhiLayoutKind,
  preset: PhiLayoutCreationPreset,
): JsonRecord {
  if (preset === "overlay-actions") {
    if (layoutKind !== "flex") {
      throw new Error('Layout creation preset "overlay-actions" requires the Flex Layout.');
    }
    return { ...PHI_FLEX_LAYOUT_OVERLAY_ACTIONS_PRESET };
  }

  if (preset === "page-base") {
    if (layoutKind !== "verticalflex") {
      throw new Error('Layout creation preset "page-base" requires the vertical Flex Layout.');
    }
    return { ...PHI_FLEX_VERTICAL_LAYOUT_PAGE_BASE_PRESET };
  }

  return { ...PHI_LAYOUT_PANEL_PRESETS_BY_KIND[layoutKind] };
}

export function applyPhiLayoutDefaults<T extends JsonRecord>(
  value: Partial<T> | null | undefined,
  defaults: JsonRecord,
): T {
  if (!isPhiRecord(value)) {
    return { ...defaults } as T;
  }

  const next: JsonRecord = { ...defaults };

  for (const [key, candidate] of Object.entries(value)) {
    if (candidate !== undefined && candidate !== null) {
      next[key] = candidate;
    }
  }

  return next as T;
}

export function stripPhiLayoutDefaults<T extends JsonRecord>(
  value: Partial<T> | null | undefined,
  defaults: JsonRecord,
): Partial<T> {
  const normalized = applyPhiLayoutDefaults<T>(value, defaults);
  const next: Partial<T> = {};

  for (const key of Object.keys(normalized) as Array<keyof T>) {
    if (!isSameValue(normalized[key], defaults[key as string])) {
      next[key] = normalized[key];
    }
  }

  return next;
}
