import {
  PHI_CORE_THEME_GROUND_BLOCKS,
  PHI_CORE_THEME_GROUND_BLOCK_KEY,
  PHI_CORE_THEME_PALETTE_BLOCKS,
  PHI_CORE_THEME_PALETTE_BLOCK_KEY,
  PHI_CORE_THEME_SETS,
  PHI_CORE_THEME_STYLE_BLOCKS,
  PHI_CORE_THEME_STYLE_BLOCK_KEY,
  resolvePhiThemeBlockSelection,
  resolvePhiThemeSetSelection,
  type PhiThemeGroundBlock,
  type PhiThemePaletteBlock,
  type PhiThemeSetBlock,
  type PhiThemeStyleBlock,
} from "./phi-theme-blocks";
import type { PhiSiteThemeRoot } from "../types/site-theme";

/**
 * What a Site follows, and what its author changed on top of it.
 *
 * The stored Theme keeps three keys and the values somebody edited. Everything else is worked out from
 * the blocks, every time. That is the whole reason a Module can improve its own look and a reset can
 * show the real thing: nothing was ever copied into the Site that would now be standing in the way.
 *
 * The author's values always win. Following a Set is a starting point, not a rule, and switching Sets
 * to try one out must never cost somebody the colour they picked yesterday.
 */

export type PhiThemeBlockReference = {
  key: string;
  version?: number | null;
};

export type PhiThemeBlockSelection = {
  set?: PhiThemeBlockReference | null;
  palette?: PhiThemeBlockReference | null;
  style?: PhiThemeBlockReference | null;
  ground?: PhiThemeBlockReference | null;
};

export type PhiThemeBlockCatalog = {
  palettes: readonly PhiThemePaletteBlock[];
  styles: readonly PhiThemeStyleBlock[];
  grounds: readonly PhiThemeGroundBlock[];
  sets: readonly PhiThemeSetBlock[];
};

export const PHI_CORE_THEME_BLOCK_CATALOG: PhiThemeBlockCatalog = {
  palettes: PHI_CORE_THEME_PALETTE_BLOCKS,
  styles: PHI_CORE_THEME_STYLE_BLOCKS,
  grounds: PHI_CORE_THEME_GROUND_BLOCKS,
  sets: PHI_CORE_THEME_SETS,
};

/** The shape this reads out of a stored Theme, named separately so callers need no runtime type. */
export type PhiThemeCompositionSource = {
  blocks?: PhiThemeBlockSelection | null;
  /** The single preset key from before the Theme had three parts. */
  preset?: string | null;
  presetVersion?: number | null;
  root?: PhiSiteThemeRoot | null;
};

/**
 * Which blocks a stored Theme names.
 *
 * A Theme written before the split names one preset, and that preset was the palette. Reading it as
 * the palette selection is the whole migration: no rewrite, no version to bump, and a Site that is
 * never opened keeps rendering exactly as it did.
 *
 * A named Set fills in the parts that were never chosen on their own. A part chosen explicitly wins
 * over the Set, which is what lets somebody follow "Forest" and still keep their own ground.
 */
export function readPhiThemeBlockSelection(
  theme: PhiThemeCompositionSource | null | undefined,
  catalog: PhiThemeBlockCatalog = PHI_CORE_THEME_BLOCK_CATALOG,
): { palette: string | null; style: string | null; ground: string | null; set: string | null } {
  const blocks = theme?.blocks ?? null;
  const setKey = blocks?.set?.key?.trim() || null;
  const set = setKey ? catalog.sets.find((candidate) => candidate.key === setKey) ?? null : null;

  return {
    set: setKey,
    palette: blocks?.palette?.key?.trim() || set?.palette || theme?.preset?.trim() || null,
    style: blocks?.style?.key?.trim() || set?.style || null,
    ground: blocks?.ground?.key?.trim() || set?.ground || null,
  };
}

export type PhiThemeComposition = {
  palette: PhiThemePaletteBlock;
  style: PhiThemeStyleBlock;
  ground: PhiThemeGroundBlock;
  set: PhiThemeSetBlock | null;
  /** The parts whose selection could not be resolved and are running on the core block instead. */
  unavailable: {
    palette: string | null;
    style: string | null;
    ground: string | null;
    set: string | null;
  };
};

/**
 * The three blocks a Theme actually runs on.
 *
 * Resolved one part at a time, never as a Set: switching off the Module that shipped a ground must not
 * take the palette of a Set that used both with it. Each part that could not be resolved names what it
 * asked for, so the workspace can say "this Module is gone" rather than showing the core look as if
 * somebody had chosen it.
 */
export function resolvePhiThemeComposition(
  theme: PhiThemeCompositionSource | null | undefined,
  catalog: PhiThemeBlockCatalog = PHI_CORE_THEME_BLOCK_CATALOG,
): PhiThemeComposition {
  const selection = readPhiThemeBlockSelection(theme, catalog);
  const set = selection.set ? resolvePhiThemeSetSelection(catalog.sets, selection.set) : null;
  const palette = resolvePhiThemeBlockSelection(
    catalog.palettes,
    selection.palette,
    PHI_CORE_THEME_PALETTE_BLOCK_KEY,
  );
  const style = resolvePhiThemeBlockSelection(
    catalog.styles,
    selection.style,
    PHI_CORE_THEME_STYLE_BLOCK_KEY,
  );
  const ground = resolvePhiThemeBlockSelection(
    catalog.grounds,
    selection.ground,
    PHI_CORE_THEME_GROUND_BLOCK_KEY,
  );

  return {
    palette: palette.block,
    style: style.block,
    ground: ground.block,
    set: set?.available ? set.set : null,
    unavailable: {
      palette: palette.available ? null : palette.requested,
      style: style.available ? null : style.requested,
      ground: ground.available ? null : ground.requested,
      set: set && !set.available ? set.requested : null,
    },
  };
}

/**
 * The ground a Site paints: the block's, with whatever its author set on top.
 *
 * Merged per part rather than per object. An author edits one mode of one surface at a time, and a
 * whole-object merge would let a dark ground somebody never opened disappear the moment they touched
 * the light one. A part that is present wins outright, including an explicit "none": switching a
 * ground off is a decision, and the block must not paint over it.
 */
export function resolvePhiThemeEffectiveRoot(
  authored: PhiSiteThemeRoot | null | undefined,
  ground: PhiThemeGroundBlock,
): PhiSiteThemeRoot {
  const base = ground.root;
  const background = {
    light: authored?.background?.light ?? base.background?.light ?? null,
    dark: authored?.background?.dark ?? base.background?.dark ?? null,
  };
  const shadow = {
    header: authored?.chrome?.shadow?.header ?? base.chrome?.shadow?.header,
    sider: authored?.chrome?.shadow?.sider ?? base.chrome?.shadow?.sider,
    footer: authored?.chrome?.shadow?.footer ?? base.chrome?.shadow?.footer,
  };
  const chrome = {
    light: authored?.chrome?.light ?? base.chrome?.light ?? null,
    dark: authored?.chrome?.dark ?? base.chrome?.dark ?? null,
    ...(shadow.header || shadow.sider || shadow.footer ? { shadow } : {}),
  };

  return {
    ...base,
    ...(authored ?? {}),
    background,
    chrome,
  };
}
