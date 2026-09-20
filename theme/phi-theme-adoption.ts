import {
  PHI_CORE_THEME_FONTS_BLOCKS,
  PHI_CORE_THEME_GROUND_BLOCKS,
  PHI_CORE_THEME_SETS,
  PHI_CORE_THEME_STYLE_BLOCKS,
  type PhiThemeFontsBlock,
  type PhiThemeGroundBlock,
  type PhiThemeSetBlock,
  type PhiThemeStyleBlock,
} from "./phi-theme-blocks";
import { resolvePhiThemeEffectiveFonts, resolvePhiThemeEffectiveRoot, type PhiThemeComposition } from "./phi-theme-composition";
import { mergePhiThemePalettes, PHI_CORE_THEME_PRESET_PLUGINS, type PhiThemePalette, type PhiThemePresetPlugin } from "./phi-theme-presets";
import type { PhiSiteFontSlots, PhiSiteThemeRoot } from "../types/site-theme";
import type { PhiControlShapeCorners } from "./phi-control-shape";

/**
 * Whether a block ships with phis-ui and can therefore never be missing.
 *
 * Core is the floor every selection falls back to; a Site that follows a core block keeps following
 * it, because there is nothing to be independent of.
 */
export function isPhiCoreThemeGround(ground: Pick<PhiThemeGroundBlock, "key">) {
  return PHI_CORE_THEME_GROUND_BLOCKS.some((block) => block.key === ground.key);
}

export function isPhiCoreThemePalette(palette: Pick<PhiThemePresetPlugin, "key">) {
  return PHI_CORE_THEME_PRESET_PLUGINS.some((block) => block.key === palette.key);
}

export function isPhiCoreThemeStyle(style: Pick<PhiThemeStyleBlock, "key">) {
  return PHI_CORE_THEME_STYLE_BLOCKS.some((block) => block.key === style.key);
}

export function isPhiCoreThemeFonts(fonts: Pick<PhiThemeFontsBlock, "key">) {
  return PHI_CORE_THEME_FONTS_BLOCKS.some((block) => block.key === fonts.key);
}

export function isPhiCoreThemeSet(set: Pick<PhiThemeSetBlock, "key">) {
  return PHI_CORE_THEME_SETS.some((block) => block.key === set.key);
}

/** The slice of a Site Theme the adoption reads and writes. */
export type PhiThemeAdoptionSource = {
  root?: PhiSiteThemeRoot | null;
  fonts?: PhiSiteFontSlots | null;
  palette?: PhiThemePalette | null;
  style?: { token?: Record<string, unknown> } | null;
  shape?: { controls?: PhiControlShapeCorners | null } | null;
};

/**
 * Taking a Module's ground over into the Site's own record.
 *
 * Following a block costs nothing and is reversible: the Site stores a key, the Module delivers the
 * look, and switching the Module off takes the look with it. Saving a Theme that resolves to a Module's
 * block is the other case. Somebody who saves has decided to keep what they see, and a look somebody
 * decided on must not depend on a package staying installed -- nor may it come apart halfway, with the
 * picture kept and the frame over it gone the day the Module is switched off.
 *
 * So the whole effective ground becomes the Site's: the Root Background of both modes, the Chrome of
 * both modes, and its Shadow. Parts the author already set stay as they are; the rest is copied from the
 * block exactly as it resolved. The key stays in `blocks` as provenance, which is what lets a reset show
 * the Module's current version again and lets the workspace say where the look came from.
 *
 * A picture copied this way is still the Module's data URL at this point; the upload that turns it into
 * a Site Asset happens in the Client, on the same save, because it needs the Media library.
 */
export function adoptPhiThemeModuleGround<T extends PhiThemeAdoptionSource>(
  theme: T,
  ground: PhiThemeGroundBlock,
): T {
  if (isPhiCoreThemeGround(ground)) {
    return theme;
  }
  return { ...theme, root: resolvePhiThemeEffectiveRoot(theme.root, ground) };
}

/**
 * Taking a Module's palette over: the block laid under whatever the Site already owns, in the one
 * palette shape both sides share. A core palette is left followed.
 */
export function adoptPhiThemeModulePalette<T extends PhiThemeAdoptionSource>(
  theme: T,
  palette: PhiThemePresetPlugin,
): T {
  if (isPhiCoreThemePalette(palette)) {
    return theme;
  }
  return { ...theme, palette: mergePhiThemePalettes(palette.palette, theme.palette) };
}

/**
 * Taking a Module's style over: its tokens under the author's, and its Control shape where the author
 * picked none. A core style is left followed.
 */
export function adoptPhiThemeModuleStyle<T extends PhiThemeAdoptionSource>(
  theme: T,
  style: PhiThemeStyleBlock,
): T {
  if (isPhiCoreThemeStyle(style)) {
    return theme;
  }
  return {
    ...theme,
    style: { ...(theme.style ?? {}), token: { ...style.style.token, ...(theme.style?.token ?? {}) } },
    shape: { ...(theme.shape ?? {}), controls: theme.shape?.controls ?? style.shape.controls },
  };
}

/**
 * Taking a Module's lettering over: its families under the author's, slot by slot. A core block is
 * left followed.
 *
 * What is copied is the family *name*. That is deliberately half the job: a name the Site owns still
 * resolves against a declaration the Module carries, and the day the Module goes the browser is handed
 * a bare name. The other half -- copying the file into the Media library and pointing the slot at the
 * Asset -- runs in the Client on the same save, the way a ground's pictures do, once a Module can say
 * where its files are. Until then a saved Theme owns the choice and follows the declaration.
 */
export function adoptPhiThemeModuleFonts<T extends PhiThemeAdoptionSource>(
  theme: T,
  fonts: PhiThemeFontsBlock,
): T {
  if (isPhiCoreThemeFonts(fonts)) {
    return theme;
  }
  return { ...theme, fonts: resolvePhiThemeEffectiveFonts(theme.fonts, fonts) };
}

/**
 * Every Module block a saved Theme resolves to, taken over at once.
 *
 * One call for the four parts so a save cannot leave the record owning the ground of a Module and
 * still following its palette: a Site that saved is independent of every Module its Theme came from.
 */
export function adoptPhiThemeModuleBlocks<T extends PhiThemeAdoptionSource>(
  theme: T,
  composition: Pick<PhiThemeComposition, "palette" | "style" | "ground" | "fonts">,
): T {
  return adoptPhiThemeModuleFonts(
    adoptPhiThemeModuleGround(
      adoptPhiThemeModuleStyle(adoptPhiThemeModulePalette(theme, composition.palette), composition.style),
      composition.ground,
    ),
    composition.fonts,
  );
}
