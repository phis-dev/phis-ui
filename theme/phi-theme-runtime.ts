import {
  PHI_CORE_THEME_BLOCK_CATALOG,
  resolvePhiThemeComposition,
  resolvePhiThemeEffectiveRoot,
  type PhiThemeBlockCatalog,
  type PhiThemeComposition,
} from "./phi-theme-composition";
import type { PhiSiteThemeRoot } from "../types/site-theme";

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
  antd?: {
    token?: Record<string, unknown>;
    components?: Record<string, Record<string, unknown>>;
  } | null;
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
 *   are then literally the same thing to everything downstream
 * - the style block's tokens go under the author's, so an author who set a radius keeps it while the
 *   ones they never touched follow the block
 * - the ground is merged part by part into `root`
 *
 * The composition comes back alongside, because the workspace needs to know which parts are running on
 * a core block after the Module that shipped theirs was switched off.
 */
export function resolvePhiThemeRuntimePayload<T extends PhiThemeRuntimeSource>(
  theme: T | null | undefined,
  catalog: PhiThemeBlockCatalog = PHI_CORE_THEME_BLOCK_CATALOG,
): PhiThemeRuntimeResult<T> {
  const composition = resolvePhiThemeComposition(
    theme as Parameters<typeof resolvePhiThemeComposition>[0],
    catalog,
  );

  const authoredToken = theme?.antd?.token ?? {};
  const styleToken = composition.style.antd.token;

  return {
    composition,
    theme: {
      ...((theme ?? {}) as T),
      preset: composition.palette.key,
      presetVersion: composition.palette.version,
      root: resolvePhiThemeEffectiveRoot(theme?.root, composition.ground),
      antd: {
        ...(theme?.antd ?? {}),
        token: { ...styleToken, ...authoredToken },
      },
    },
  };
}
