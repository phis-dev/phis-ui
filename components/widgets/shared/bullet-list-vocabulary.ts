import { isPhiRecord } from "../../../helpers/is-record";
import type { PhiCmsConfigField } from "../../../types/cms-plugins";
import { readPhiSurface, type PhiSurface } from "../../../types/surface";
import { PHI_SPACING_SCALE_KEYS, type PhiSpacingScaleKey } from "../config/spacing-options";

/*
 * A list's words, apart from the Control that draws it: Widget definitions read them on the server, and
 * each Widget that has a list -- the Description's aside, the Markdown text's lists -- stores the same
 * style under a key of its own and offers the same fields for it.
 */

/**
 * What stands before an entry. `number` counts the entries of its level from 1 (or a Markdown list's
 * own start); `icon` draws the list's one icon; `none` draws nothing and keeps the indent.
 */
export const PHI_BULLET_LIST_MARKERS = ["dot", "circle", "dash", "number", "icon", "none"] as const;
export type PhiBulletListMarker = (typeof PHI_BULLET_LIST_MARKERS)[number];

/**
 * How deep a list goes. Each level has a marker of its own; an entry written deeper stands at the
 * deepest, and a Markdown list nested deeper takes the deepest level's marker.
 */
export const PHI_BULLET_LIST_LEVELS = [1, 2, 3] as const;
export type PhiBulletListLevel = (typeof PHI_BULLET_LIST_LEVELS)[number];

export const PhiBulletListFlag = {
  /** A line between entries, for entries without a ground of their own. */
  Dividers: 1 << 0,
} as const;

/**
 * How a list is set. Absent parts take the defaults below.
 *
 * `itemSurface` is each entry's own box, from the Surface vocabulary -- a card, a wash, or nothing. A
 * box around the whole list is the Widget's Surface, not this. An entry's Surface has no `tone`: a mode
 * of its own is a theme scope per entry, which is a page's worth of providers for a list.
 */
export type PhiBulletListStyle = {
  level1?: PhiBulletListMarker;
  level2?: PhiBulletListMarker;
  level3?: PhiBulletListMarker;
  /** An icon name, as the icon picker writes it; drawn by every level whose marker is `icon`. */
  icon?: string;
  itemSurface?: PhiSurface | null;
  gap?: PhiSpacingScaleKey;
  flags?: number;
};

export type PhiResolvedBulletListStyle = {
  markers: Record<PhiBulletListLevel, PhiBulletListMarker>;
  icon: string | null;
  itemSurface: PhiSurface | null;
  gap: PhiSpacingScaleKey;
  flags: number;
};

/** The markers a browser cycles through, and a tight gap. */
const PHI_BULLET_LIST_DEFAULT_STYLE = {
  level1: "dot",
  level2: "circle",
  level3: "dash",
  gap: "xs",
} as const satisfies PhiBulletListStyle;

function readMarker(value: unknown): PhiBulletListMarker | undefined {
  return PHI_BULLET_LIST_MARKERS.includes(value as PhiBulletListMarker) ? value as PhiBulletListMarker : undefined;
}

/** A stored list style, part by part; whatever is not one of its values is left out. */
export function readPhiBulletListStyle(value: unknown): PhiBulletListStyle | undefined {
  if (!isPhiRecord(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const { tone: _tone, ...itemSurface } = readPhiSurface(record.itemSurface) ?? {};
  void _tone;
  const style: PhiBulletListStyle = {
    level1: readMarker(record.level1),
    level2: readMarker(record.level2),
    level3: readMarker(record.level3),
    icon: typeof record.icon === "string" && record.icon.trim() ? record.icon : undefined,
    // `null` is a list whose entries were set to have no box, which a default must not draw again.
    itemSurface: Object.keys(itemSurface).length > 0 ? itemSurface : record.itemSurface === null ? null : undefined,
    gap: PHI_SPACING_SCALE_KEYS.includes(record.gap as PhiSpacingScaleKey) ? record.gap as PhiSpacingScaleKey : undefined,
    flags: typeof record.flags === "number" && Number.isInteger(record.flags) ? record.flags : undefined,
  };
  const stated = Object.fromEntries(Object.entries(style).filter(([, part]) => part !== undefined));
  return Object.keys(stated).length > 0 ? stated as PhiBulletListStyle : undefined;
}

export function resolvePhiBulletListStyle(style: PhiBulletListStyle | null | undefined): PhiResolvedBulletListStyle {
  return {
    markers: {
      1: style?.level1 ?? PHI_BULLET_LIST_DEFAULT_STYLE.level1,
      2: style?.level2 ?? PHI_BULLET_LIST_DEFAULT_STYLE.level2,
      3: style?.level3 ?? PHI_BULLET_LIST_DEFAULT_STYLE.level3,
    },
    icon: style?.icon ?? null,
    itemSurface: style?.itemSurface ?? null,
    gap: style?.gap ?? PHI_BULLET_LIST_DEFAULT_STYLE.gap,
    flags: style?.flags ?? 0,
  };
}

/** The level an entry at `depth` (1 for the outermost) is drawn at. */
export function resolvePhiBulletListLevel(depth: number): PhiBulletListLevel {
  const deepest = PHI_BULLET_LIST_LEVELS[PHI_BULLET_LIST_LEVELS.length - 1]!;
  return Math.min(Math.max(1, Math.trunc(depth) || 1), deepest) as PhiBulletListLevel;
}

/**
 * One entry of a list written as a list: its text, how deep it stands, and the values its text names.
 *
 * `values` keep what changes from Site to Site out of the sentence: "Site key: %1" with the key beside it
 * is translated once and filled after, where "Site key: acme" would be a sentence of its own for every
 * Site and never found in a catalogue. The values themselves are never translated.
 */
export type PhiBulletListEntry = {
  text: string;
  /** 1 for the outermost level, which is what an entry without one stands at. */
  level?: number;
  values?: string[];
};

export function readPhiBulletListEntries(value: unknown): PhiBulletListEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry): PhiBulletListEntry[] => {
    if (!isPhiRecord(entry) || typeof entry.text !== "string") {
      return [];
    }
    const record = entry as Record<string, unknown>;
    const level = typeof record.level === "number" ? resolvePhiBulletListLevel(record.level) : 1;
    const values = Array.isArray(record.values)
      ? record.values.map((item) => (typeof item === "string" || typeof item === "number" ? String(item) : ""))
      : [];
    return [{
      text: record.text as string,
      ...(level > 1 ? { level } : {}),
      ...(values.length > 0 ? { values } : {}),
    }];
  });
}

/** An entry of the tree the Control draws: what it shows, and the entries one level below it. */
export type PhiBulletListNode<Content> = {
  content: Content;
  children?: PhiBulletListNode<Content>[];
};

/**
 * A list written flat, with levels, as the tree it reads as. An entry deeper than the one before it by
 * more than a level hangs one level below it all the same: a level cannot be skipped in a nested list,
 * and an entry that tried stays with the entry it follows rather than jumping.
 */
export function buildPhiBulletListTree<Entry extends { level?: number }, Content>(
  entries: readonly Entry[],
  content: (entry: Entry, index: number) => Content,
): PhiBulletListNode<Content>[] {
  const root: PhiBulletListNode<Content>[] = [];
  const open: PhiBulletListNode<Content>[][] = [root];
  entries.forEach((entry, index) => {
    const wanted = resolvePhiBulletListLevel(entry.level ?? 1);
    const level = Math.min(wanted, open.length);
    open.length = level;
    const node: PhiBulletListNode<Content> = { content: content(entry, index) };
    open[level - 1]!.push(node);
    node.children = [];
    open.push(node.children);
  });
  const prune = (nodes: PhiBulletListNode<Content>[]) => {
    for (const node of nodes) {
      if (node.children?.length) {
        prune(node.children);
      } else {
        delete node.children;
      }
    }
  };
  prune(root);
  return root;
}

const PHI_BULLET_LIST_MARKER_LABELS: Record<PhiBulletListMarker, string> = {
  dot: "Dot",
  circle: "Circle",
  dash: "Dash",
  number: "Number",
  icon: "Icon",
  none: "None",
};

/**
 * The Inspector fields for a list style stored under `key`, under a divider titled `heading`. Every Widget
 * with a list offers these, so a list is set the same way wherever it stands.
 */
export function buildPhiBulletListFields(key: string, heading: string): PhiCmsConfigField[] {
  const markerOptions = PHI_BULLET_LIST_MARKERS.map((marker) => ({ value: marker, label: PHI_BULLET_LIST_MARKER_LABELS[marker] }));
  return [
    ...PHI_BULLET_LIST_LEVELS.map((level, index): PhiCmsConfigField => ({
      key: `${key}.level${level}`,
      type: "choice",
      label: `Level ${level}`,
      options: markerOptions,
      ...(index === 0 ? { heading } : {}),
    })),
    { key: `${key}.icon`, type: "icon", label: "Icon" },
    {
      key: `${key}.gap`,
      type: "choice",
      label: "Gap",
      options: PHI_SPACING_SCALE_KEYS.map((gap) => ({ value: gap, label: gap })),
    },
    {
      key: `${key}.flags`,
      type: "flags",
      label: "Lines",
      options: [{ value: PhiBulletListFlag.Dividers, label: "Dividers between entries" }],
    },
    { key: `${key}.itemSurface`, type: "surface", label: "Entries", tone: false },
  ];
}
