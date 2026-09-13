import {
  PHI_CORE_THEME_BLOCK_CATALOG,
  resolvePhiThemeComposition,
  resolvePhiThemeEffectiveRoot,
  type PhiThemeBlockCatalog,
  type PhiThemeComposition,
} from "./phi-theme-composition";
import type { PhiSiteThemeRoot } from "../types/site-theme";
import type { PhiThemePalette } from "./phi-theme-presets";
import { readPhiControlShapeCorners, type PhiControlShapeCorners } from "./phi-control-shape";

/**
 * The Theme as everything downstream should see it: blocks resolved, author values on top.
 *
 * Every consumer of a Site Theme -- the Ant Design tokens, the Root Background layer, the Chrome
 * Overlay variables, the server-side token snapshot -- reads the same three fields it always read.
 * Rather than teaching each of them about blocks, the blocks are folded in once, here, and what comes
 * out is an ordinary Theme record.
 *
 * That keeps the seam in one place, and it keeps the stored record honest: nothing downstream can talk
 * anybody into persisting a resolved value, because the resolved value never travels back.
 */

export type PhiThemeRuntimeSource = {
  blocks?: unknown;
  preset?: string | null;
  presetVersion?: number | null;
  root?: PhiSiteThemeRoot | null;
  palette?: PhiThemePalette | null;
  style?: { token?: Record<string, unknown> } | null;
  shape?: { controls?: PhiControlShapeCorners | null } | null;
  components?: Record<string, Record<string, unknown>> | null;
};

export type PhiThemeRuntimeResult<T> = {
  theme: T;
  composition: PhiThemeComposition;
};

/**
 * Folds the blocks a Theme follows into the record itself.
 *
 * Three moves, one per part:
 *
 * - the palette becomes `preset`, because that is the field every colour consumer already resolves
 *   against the preset plugins; a Theme that names a palette block and one that names the old preset
 *   are then literally the same thing to everything downstream. The Site's own `palette` stays as it
 *   is: the colour consumers lay it over the preset themselves, per mode
 * - the style block's tokens go under the author's `style.token`, so an author who set a radius keeps
 *   it while the ones they never touched follow the block; the block's Control shape stands wherever
 *   the author picked none
 * - the ground is merged part by part into `root`
 *
 * The composition comes back alongside, because the workspace needs to know which parts are running on
 * a core block after the Module that shipped theirs was switched off.
 */
export function resolvePhiThemeRuntimePayload<T extends PhiThemeRuntimeSource>(
  theme: T | null | undefined,
  catalog: PhiThemeBlockCatalog = PHI_CORE_THEME_BLOCK_CATALOG,
): PhiThemeRuntimeResult<T & PhiThemeRuntimeSource> {
  const composition = resolvePhiThemeComposition(
    theme as Parameters<typeof resolvePhiThemeComposition>[0],
    catalog,
  );

  const authoredToken = theme?.style?.token ?? {};
  const styleToken = composition.style.style.token;

  return {
    composition,
    theme: {
      ...((theme ?? {}) as T & PhiThemeRuntimeSource),
      preset: composition.palette.key,
      presetVersion: composition.palette.version,
      root: resolvePhiThemeEffectiveRoot(theme?.root, composition.ground),
      style: {
        ...(theme?.style ?? {}),
        token: { ...styleToken, ...authoredToken },
      },
      shape: {
        ...(theme?.shape ?? {}),
        controls: readPhiControlShapeCorners(theme?.shape?.controls) ??
          readPhiControlShapeCorners(composition.style.shape?.controls) ??
          failMissingStyleShape(composition.style.key),
      },
    },
  };
}

/** A style block without a shape is a broken block -- a Module's, since the core one states it. */
function failMissingStyleShape(styleKey: string): never {
  throw new Error(`Theme style "${styleKey}" states no Control shape.`);
}
