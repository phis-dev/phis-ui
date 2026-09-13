import { PHI_CORE_THEME_PRESET_PLUGINS, type PhiThemePresetPlugin } from "./phi-theme-presets";
import type { PhiSiteThemeRoot } from "../types/site-theme";
import { createPhiControlShapeCorners, type PhiControlShapeCorners } from "./phi-control-shape";
import { PHI_THEME_PHIS_GROUND_IMAGE_DARK, PHI_THEME_PHIS_GROUND_IMAGE_LIGHT } from "./phi-theme-ground-image";

/**
 * A Theme as three parts, each of them something a Module can ship.
 *
 * A Site Theme used to be one preset carrying colours and nothing else, while the style tokens and the
 * ground were authored per Site and could not be handed over at all. Naming a look -- "Forest" -- then
 * meant naming a palette and rebuilding the rest by hand on every Site that wanted it.
 *
 * The three parts are the three tabs an author already sees: Palette is colour, Style is everything
 * that is not colour, Ground is the Root Background together with the Chrome Overlay and its Shadow.
 * They are separate because they are separately reusable: a palette suits a brand, a ground suits a
 * picture, and mixing one brand with another ground is a normal thing to want.
 *
 * A Set is only a name and three keys. It composes, it does not contain, so a Module that ships a Set
 * can point at blocks somebody else shipped, and an author who follows a Set can still swap one part.
 *
 * What a Site stores stays small: which blocks it follows, and the values its author changed. The
 * blocks themselves live in code, which is what lets a Module update its own look and lets a reset
 * show the real thing again rather than a copy that was frozen at some point.
 *
 * A Module's blocks are taken over whole by a save (theme/phi-theme-adoption.ts): a look somebody
 * decided on must not depend on a package staying installed, and must not come apart halfway --
 * picture kept, frame and colour gone -- when it is switched off. Core blocks are followed, never copied.
 */

export type PhiThemeBlockIdentity = {
  key: string;
  version: number;
  title: string;
  description?: string;
};

/**
 * Colour, which is the block that already existed.
 *
 * It keeps its own name and shape so every Module that ships a Theme preset today keeps working; the
 * word "Palette" is what this file calls it, not a second contract.
 */
export type PhiThemePaletteBlock = PhiThemePresetPlugin;

/**
 * Everything that is not colour: radii, spacing, control heights, type scale, and the Control shape.
 *
 * The tokens are stated as the Ant Design tokens the block changes rather than as a full set, because a
 * block that repeated every structural token would silently freeze the ones it never meant to have an
 * opinion about. The shape is always stated: it is the one part of a style every Site renders, and a
 * block that left it open would hand the decision to a default nobody chose.
 */
export type PhiThemeStyleBlock = PhiThemeBlockIdentity & {
  style: { token: Record<string, string | number | boolean> };
  shape: { controls: PhiControlShapeCorners };
};

/**
 * The ground: the Root Background, the Chrome Overlay, and the Shadow the Chrome casts.
 *
 * All three in one block because they are one decision. A frosted Chrome over a dark picture needs
 * different edges than a flat colour, and splitting them would let an author compose the two halves
 * of a look that was never meant to come apart.
 */
export type PhiThemeGroundBlock = PhiThemeBlockIdentity & {
  root: PhiSiteThemeRoot;
};

/** A named composition of the three, by key. It points; it does not carry. */
export type PhiThemeSetBlock = PhiThemeBlockIdentity & {
  palette: string;
  style: string;
  ground: string;
};

/**
 * The blocks that ship with phis-ui and can never be missing.
 *
 * One of each, all named "Phis": every selection resolves against these when the block it names is
 * not available -- a Module that was switched off, or one that never was installed. That makes "not
 * resolvable" an ordinary state rather than an error, and it is why the core ground carries its
 * picture inline: a guaranteed floor cannot depend on a file that a package might not carry, and a
 * data URL is code, not a file. Further looks are Modules' business.
 */
export const PHI_CORE_THEME_PALETTE_BLOCK_KEY = "phis";
export const PHI_CORE_THEME_STYLE_BLOCK_KEY = "phis";
export const PHI_CORE_THEME_GROUND_BLOCK_KEY = "phis";
export const PHI_CORE_THEME_SET_KEY = "phis";

export const PHI_CORE_THEME_PALETTE_BLOCKS: readonly PhiThemePaletteBlock[] =
  PHI_CORE_THEME_PRESET_PLUGINS;

export const PHI_CORE_THEME_STYLE_BLOCKS: readonly PhiThemeStyleBlock[] = [
  {
    key: "phis",
    version: 1,
    title: "Phis",
    description: "The house proportions: soft radii, generous spacing.",
    style: { token: {} },
    shape: { controls: createPhiControlShapeCorners("rounded") },
  },
];

/*
 * The ground: soft colour fields in the Phis palette under the outlined wordmark, as an inline SVG per
 * mode, with a frosted frame over it.
 *
 * Inline is the condition. The floor every Site falls back to may depend on nothing that can go
 * missing -- no Asset, no static file -- and a data URL meets that the way a gradient does. Both modes
 * are stated: an author should never have to build the dark half of a look that was handed to them
 * complete. Following this ground uploads nothing; only a Module's pictures are taken over on save.
 */
export const PHI_CORE_THEME_GROUND_BLOCKS: readonly PhiThemeGroundBlock[] = [
  {
    key: "phis",
    version: 1,
    title: "Phis",
    description: "Soft colour fields under the outlined phi/s wordmark, with a frosted frame over it.",
    root: {
      background: {
        light: {
          base: {
            kind: "image",
            sourceKind: "url",
            sourceUrl: PHI_THEME_PHIS_GROUND_IMAGE_LIGHT,
            size: "cover",
            repeat: "no-repeat",
          },
          overlay: null,
          effect: null,
          motion: { mode: "fixed" },
        },
        dark: {
          base: {
            kind: "image",
            sourceKind: "url",
            sourceUrl: PHI_THEME_PHIS_GROUND_IMAGE_DARK,
            size: "cover",
            repeat: "no-repeat",
          },
          overlay: null,
          effect: null,
          motion: { mode: "fixed" },
        },
      },
      chrome: {
        light: {
          base: { kind: "color", color: "rgba(255, 255, 255, 0.55)" },
          overlay: null,
          effect: "glass",
          motion: null,
        },
        dark: {
          base: { kind: "color", color: "rgba(9, 14, 26, 0.55)" },
          overlay: null,
          effect: "glass",
          motion: null,
        },
        shadow: { header: "soft", sider: "soft", footer: "soft" },
      },
    },
  },
];

export const PHI_CORE_THEME_SETS: readonly PhiThemeSetBlock[] = [
  {
    key: "phis",
    version: 1,
    title: "Phis",
    description: "The house look: warm orange on a deep blue text base.",
    palette: "phis",
    style: "phis",
    ground: "phis",
  },
];

/**
 * The block a selection names, and whether it is the one that was asked for.
 *
 * A selection that cannot be resolved is not an error: a Module gets switched off, and the Site it
 * dressed keeps running on the core block until somebody switches it back on. The flag is what lets
 * the Theme workspace say so instead of pretending the author chose this.
 *
 * The selection itself is never rewritten on the way through. That is what makes switching the Module
 * back on enough to have the look again.
 */
export function resolvePhiThemeBlockSelection<T extends PhiThemeBlockIdentity>(
  blocks: readonly T[],
  key: string | null | undefined,
  fallbackKey: string,
): { block: T; requested: string | null; available: boolean } {
  const requested = key?.trim() || null;
  const found = requested ? blocks.find((block) => block.key === requested) : undefined;
  if (found) {
    return { block: found, requested, available: true };
  }

  const fallback = blocks.find((block) => block.key === fallbackKey);
  if (!fallback) {
    throw new Error(`Theme block "${fallbackKey}" is missing from the core blocks.`);
  }

  return { block: fallback, requested, available: false };
}

export function resolvePhiThemeBlock<T extends PhiThemeBlockIdentity>(
  blocks: readonly T[],
  key: string | null | undefined,
  fallbackKey: string,
): T {
  return resolvePhiThemeBlockSelection(blocks, key, fallbackKey).block;
}

/**
 * The three keys a Set stands for, or the core keys where it names nothing available.
 *
 * A Set is resolved one part at a time rather than as a unit: a Module that ships a ground can be
 * switched off without taking the palette of a Set that used both with it.
 */
export function resolvePhiThemeSetSelection(
  sets: readonly PhiThemeSetBlock[],
  key: string | null | undefined,
): { set: PhiThemeSetBlock; requested: string | null; available: boolean } {
  const resolved = resolvePhiThemeBlockSelection(sets, key, PHI_CORE_THEME_SET_KEY);
  return { set: resolved.block, requested: resolved.requested, available: resolved.available };
}
