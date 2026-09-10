"use client";

import { runPhiMediaUploadSession } from "../../../components/media/media-upload-flow";
import { resolvePhiThemeEffectiveRoot } from "../../../theme/phi-theme-composition";
import type { PhiThemeGroundBlock } from "../../../theme/phi-theme-blocks";
import type { PhiSiteThemeRoot } from "../../../types/site-theme";

/**
 * Taking a picture a Module brought into the Site's own Media library.
 *
 * A ground a Module ships carries its picture in the package, and a Site that merely follows that
 * ground needs nothing else: the Module delivers it, and switching the Module off takes the look with
 * it, which is what somebody switching it off asked for.
 *
 * Editing the Theme is the moment that changes. Somebody who opens the ground and changes it has made
 * it theirs, and a look somebody has worked on should not depend on a package staying installed. So a
 * draft that carries such a picture brings it into the Media library on the way to the server and
 * points at the Asset from then on. The Site owns it; the Module is out of the picture.
 *
 * Only on a draft save, never on a keystroke: a draft in memory is somebody thinking out loud, and an
 * upload for every intermediate state would fill the library with pictures nobody chose. The upload
 * goes through the ordinary session, so quota, sniffing and the checksum that recognises a duplicate
 * all apply -- following the same ground twice does not leave two copies.
 */

/** What the Theme may carry as a picture, narrowed to the fields this touches. */
type ThemeImageBase = {
  kind?: string;
  sourceKind?: string;
  sourceUrl?: string;
  assetId?: number | null;
  [key: string]: unknown;
};

export type PhiThemeImageMaterializeResult<T> = {
  theme: T;
  /** The Assets created on the way, newest first, for a caller that wants to say what happened. */
  assetIds: readonly number[];
};

/**
 * Whether this picture still belongs to whoever shipped it.
 *
 * Two shapes qualify: a data URL, which is how a Module carries a picture inside its code, and a path
 * on this origin, which is how a Module's file would be served once packages may ship files. Anything
 * else is either already an Asset or a picture on somebody else's server, and neither is ours to copy.
 */
function isPhiThemeModuleImage(base: ThemeImageBase | null | undefined) {
  if (!base || base.kind !== "image" || base.sourceKind === "asset") return false;
  const source = typeof base.sourceUrl === "string" ? base.sourceUrl : "";
  return source.startsWith("data:image/") || source.startsWith("/");
}

function readPhiDataUrlContentType(source: string) {
  const match = source.match(/^data:([^;,]+)[;,]/);
  return match?.[1] ?? "image/jpeg";
}

function buildPhiThemeImageFileName(contentType: string, hint: string) {
  const extension = contentType.split("/")[1]?.split("+")[0] ?? "jpg";
  const stem = hint.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return `${stem || "theme-ground"}.${extension === "jpeg" ? "jpg" : extension}`;
}

async function uploadPhiThemeImage(source: string, hint: string) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Could not read the Theme picture (${response.status}).`);
  }
  const blob = await response.blob();
  const contentType = blob.type || readPhiDataUrlContentType(source);
  const file = new File([blob], buildPhiThemeImageFileName(contentType, hint), { type: contentType });
  const result = await runPhiMediaUploadSession(file, undefined, {
    meta: { origin: "theme-ground" },
  });
  return result.asset.id;
}

/**
 * Rewrites every ground picture that is still the Module's into one the Site owns.
 *
 * The two modes are handled separately and both are uploaded, because a Site that keeps only the light
 * half of a look it edited would lose the dark one the day the Module goes. Whatever else the base
 * carries -- position, size, a focal rectangle somebody set -- travels along untouched.
 */
export async function materializePhiThemeGroundImages<T extends { root?: PhiSiteThemeRoot | null }>(
  theme: T,
  ground: PhiThemeGroundBlock,
): Promise<PhiThemeImageMaterializeResult<T>> {
  /*
   * The effective ground, not the stored one: a Site that follows a Module's ground stores a key and
   * nothing else, and that key is exactly the case this exists for. Saving such a draft takes the
   * picture over, which also turns the ground into an authored value -- what somebody saved is theirs,
   * and the two modes stop drifting apart the day the Module changes one of them.
   */
  const background = resolvePhiThemeEffectiveRoot(theme.root, ground).background;
  if (!background) return { theme, assetIds: [] };

  const assetIds: number[] = [];
  const modes = ["light", "dark"] as const;
  const nextBackground: Record<string, unknown> = { ...background };
  const uploadedBySource = new Map<string, number>();

  for (const mode of modes) {
    const entry = background[mode];
    const base = entry?.base as ThemeImageBase | undefined;
    if (!isPhiThemeModuleImage(base) || !base) continue;

    const source = String(base.sourceUrl);
    /*
     * The same picture in both modes is one upload. The server would recognise the duplicate by its
     * checksum anyway, but sending it twice to be told so is a waste of the author's wait.
     */
    const assetId = uploadedBySource.get(source)
      ?? await uploadPhiThemeImage(source, `theme-ground-${mode}`);
    if (!uploadedBySource.has(source)) {
      uploadedBySource.set(source, assetId);
      assetIds.push(assetId);
    }

    const nextBase = { ...base, sourceKind: "asset", assetId };
    delete nextBase.sourceUrl;
    nextBackground[mode] = { ...entry, base: nextBase };
  }

  if (assetIds.length === 0) return { theme, assetIds: [] };

  return {
    assetIds,
    theme: {
      ...theme,
      root: { ...(theme.root ?? {}), background: nextBackground },
    } as T,
  };
}
