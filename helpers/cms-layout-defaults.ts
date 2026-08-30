import { PHI_COLOR, PHI_MARGIN, PHI_RADIUS, PHI_SHADOW, PHI_SPACE } from "../theme/antd-css-var-contract";
import type { PhiLayoutKind } from "../components/layouts/phi-layout-contract";
import { PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR } from "./renderable-block-defaults";

type JsonRecord = Record<string, unknown>;

export type PhiLayoutDefaults = JsonRecord;
export type PhiLayoutCreationPreset = "panel" | "overlay-actions";

const PHI_LAYOUT_CHROME_PRESET_DEFAULTS = {
  borderRadius: PHI_RADIUS.base,
} as const;

export const PHI_CONTENT_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    margin: 0,
};
const PHI_CONTENT_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    margin: 0,
    padding: PHI_SPACE.base,
} as const;

export const PHI_FORM_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    margin: 0,
};
const PHI_FORM_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    margin: 0,
    padding: PHI_SPACE.xl,
} as const;

export const PHI_FLEX_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    distribution: "anchor",
    gap: 0,
    verticalSeparators: false,
    separatorBeforeFirst: false,
    separatorSpan: "75%",
    wrap: false,
};
const PHI_FLEX_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    distribution: "anchor",
    gap: PHI_MARGIN.base,
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
    background: "transparent",
    border: "none",
} as const;

export const PHI_FLEX_VERTICAL_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    gap: PHI_SPACE.sm,
};
const PHI_FLEX_VERTICAL_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    gap: PHI_SPACE.base,
    padding: PHI_SPACE.base,
} as const;

export const PHI_GRID_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    gap: 0,
    columnGap: 0,
    align: undefined,
    justify: undefined,
    wrap: false,
};
const PHI_GRID_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    gap: PHI_MARGIN.base,
    columnGap: 0,
    align: undefined,
    justify: undefined,
    wrap: false,
    padding: PHI_SPACE.base,
} as const;

export const PHI_MASONRY_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    columns: 3,
    gap: PHI_MARGIN.md,
};
const PHI_MASONRY_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    columns: 3,
    gap: PHI_MARGIN.base,
    padding: PHI_SPACE.base,
} as const;

export const PHI_STACK_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    slotTransition: "none",
};
const PHI_STACK_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    padding: PHI_SPACE.base,
} as const;

export const PHI_COLLAPSIBLE_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    anchor: PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR,
    accordion: false,
    slotTitles: [],
    translateSlotTitles: true,
    defaultOpenSlotKeys: ["slot_0"],
    collapsible: "header",
    bordered: false,
    ghost: true,
    expandIconPlacement: "start",
    collapseSize: "middle",
    titleStrong: true,
    headerPadding: PHI_SPACE.sm,
    innerPadding: PHI_SPACE.base,
};
const PHI_COLLAPSIBLE_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    anchor: PHI_RENDERABLE_BLOCK_DEFAULT_ANCHOR,
    accordion: false,
    slotTitles: [],
    translateSlotTitles: true,
    defaultOpenSlotKeys: ["slot_0"],
    collapsible: "header",
    bordered: true,
    ghost: false,
    expandIconPlacement: "start",
    collapseSize: "middle",
    titleStrong: true,
    headerPadding: PHI_SPACE.sm,
    innerPadding: PHI_SPACE.base,
    padding: PHI_SPACE.base,
} as const;

export const PHI_SPLIT_CARD_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    gap: 0,
};
const PHI_SPLIT_CARD_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    gap: PHI_SPACE.base,
    padding: "1.3125rem",
    leftPadding: PHI_SPACE.base,
    rightPadding: PHI_SPACE.base,
    leftBackground: {
      base: {
        kind: "color",
        color: PHI_COLOR.bgContainer,
      },
      overlay: null,
      effect: null,
    },
    rightBackground: {
      base: {
        kind: "color",
        color: PHI_COLOR.bgContainer,
      },
      overlay: null,
      effect: null,
    },
    leftBorder: {
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: PHI_COLOR.borderSecondary,
    },
    rightBorder: {
      borderWidth: 1,
      borderStyle: "solid",
      borderColor: PHI_COLOR.borderSecondary,
    },
    leftShadow: PHI_SHADOW.secondary,
    rightShadow: PHI_SHADOW.secondary,
} as const;

export const PHI_THREE_COLUMN_LAYOUT_DEFAULTS: PhiLayoutDefaults = {
    balancedSides: true,
    gap: 0,
    wrap: false,
};
const PHI_THREE_COLUMN_LAYOUT_PANEL_PRESET = {
    ...PHI_LAYOUT_CHROME_PRESET_DEFAULTS,
    balancedSides: true,
    gap: PHI_MARGIN.base,
    wrap: false,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: PHI_SPACE.base,
    paddingRight: PHI_SPACE.base,
} as const;

const PHI_LAYOUT_DEFAULTS_BY_KIND: Record<PhiLayoutKind, PhiLayoutDefaults> = {
  content: PHI_CONTENT_LAYOUT_DEFAULTS,
  form: PHI_FORM_LAYOUT_DEFAULTS,
  flex: PHI_FLEX_LAYOUT_DEFAULTS,
  stack: PHI_STACK_LAYOUT_DEFAULTS,
  grid: PHI_GRID_LAYOUT_DEFAULTS,
  split: PHI_SPLIT_CARD_LAYOUT_DEFAULTS,
  threecol: PHI_THREE_COLUMN_LAYOUT_DEFAULTS,
  masonry: PHI_MASONRY_LAYOUT_DEFAULTS,
  verticalflex: PHI_FLEX_VERTICAL_LAYOUT_DEFAULTS,
  collapsible: PHI_COLLAPSIBLE_LAYOUT_DEFAULTS,
};

function isPlainObject(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSameValue(left: unknown, right: unknown) {
  if (Object.is(left, right)) {
    return true;
  }

  if (!isPlainObject(left) || !isPlainObject(right)) {
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
  form: PHI_FORM_LAYOUT_PANEL_PRESET,
  flex: PHI_FLEX_LAYOUT_PANEL_PRESET,
  stack: PHI_STACK_LAYOUT_PANEL_PRESET,
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

  return { ...PHI_LAYOUT_PANEL_PRESETS_BY_KIND[layoutKind] };
}

export function applyPhiLayoutDefaults<T extends JsonRecord>(
  value: Partial<T> | null | undefined,
  defaults: JsonRecord,
): T {
  if (!isPlainObject(value)) {
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
