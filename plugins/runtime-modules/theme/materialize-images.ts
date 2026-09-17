"use client";

import { buildPhiMediaAssetContentDeliveryUrl, PhiMediaAssetFlags, PhiMediaAssetSource } from "../../../constants/media";
import { runPhiMediaUploadSession } from "../../../components/media/media-upload-flow";
import { adoptPhiThemeModuleBlocks } from "../../../theme/phi-theme-adoption";
import { resolvePhiThemeEffectiveLogo, type PhiThemeComposition } from "../../../theme/phi-theme-composition";
import type { PhiThemeSetBlock } from "../../../theme/phi-theme-blocks";
import type { PhiSiteThemeBrand, PhiSiteThemeBrandLogo, PhiSiteThemeRoot } from "../../../types/site-theme";

/**
 * Taking a ground a Module brought over into the Site's own record, pictures included.
 *
 * A ground a Module ships carries its look in the package, and a Site that merely follows that ground
 * needs nothing else: the Module delivers it, and switching the Module off takes the look with it,
 * which is what somebody switching it off asked for.
 *
 * Saving the Theme is the moment that changes. Somebody who saves has decided to keep what they see,
 * and a look somebody decided on should not depend on a package staying installed. So a draft that
 * resolves to a Module's blocks takes them over on the way to the server -- `adoptPhiThemeModuleBlocks`
 * copies palette, style tokens, the font families and the ground's background, Chrome and Shadow of
 * both modes into the record -- and every picture that is still the Module's goes into the Media library, with the draft
 * pointing at the Asset from then on. The Site owns it; the Module is out of the picture. Copying the
 * frame and the colour along with the picture is what keeps the look from coming apart halfway when the
 * Module is switched off.
 *
 * Only on a draft save, never on a keystroke: a draft in memory is somebody thinking out loud, and an
 * upload for every intermediate state would fill the library with pictures nobody chose. The upload
 * goes through the ordinary session, so quota, sniffing and the checksum that recognises a duplicate
 * all apply -- saving the same ground twice does not leave two copies.
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
  return isPhiThemeCarriedSource(base.sourceUrl);
}

function isPhiThemeCarriedSource(source: unknown) {
  return typeof source === "string" && (source.startsWith("data:image/") || source.startsWith("/"));
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

async function readPhiThemeImageFile(source: string, hint: string) {
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Could not read the Theme picture (${response.status}).`);
  }
  const blob = await response.blob();
  const contentType = blob.type || readPhiDataUrlContentType(source);
  return new File([blob], buildPhiThemeImageFileName(contentType, hint), { type: contentType });
}

async function uploadPhiThemeImage(source: string, hint: string) {
  const file = await readPhiThemeImageFile(source, hint);
  /*
   * Flagged as a background here rather than by whoever saved the Theme.
   *
   * This is the one moment the library gains a picture nobody picked out of it: a ground arrives because
   * a Theme was saved, and it is a background by the only use it has ever had. The Background Control
   * lists what carries the flag, so a ground that arrived without it would be invisible in the very
   * place it belongs -- and the Control has no upload of its own to put it right.
   */
  const result = await runPhiMediaUploadSession(file, undefined, {
    presentationFlags: PhiMediaAssetFlags.Background,
    meta: { source: PhiMediaAssetSource.ThemeGround },
  });
  return result.asset.id;
}

/**
 * Takes a Module's blocks over and rewrites every picture that is still the Module's into one the
 * Site owns.
 *
 * The two modes are handled separately and both are uploaded, because a Site that keeps only the light
 * half of a look it saved would lose the dark one the day the Module goes. Whatever else the base
 * carries -- position, size, a focal rectangle somebody set -- travels along untouched. A Theme on a
 * core ground is left following it; the core picture stays inline and is never uploaded.
 */
export async function materializePhiThemeModuleBlocks<T extends { root?: PhiSiteThemeRoot | null }>(
  source: T,
  composition: Pick<PhiThemeComposition, "palette" | "style" | "ground" | "fonts">,
): Promise<PhiThemeImageMaterializeResult<T>> {
  const theme = adoptPhiThemeModuleBlocks(source, composition);
  /*
   * The record's own ground, not the effective one. A Module's pictures are already in the record by
   * now -- the adoption put them there -- and a core ground's picture must stay where it is: the core
   * ground carries an inline picture of its own, and a Site that merely follows it must not end up
   * owning a copy in its Media library for having saved a colour. What is uploaded is therefore
   * exactly what the record holds: a Module's picture taken over, or one an author pasted.
   */
  const background = theme.root?.background;
  if (!background) return { theme, assetIds: [] };

  const assetIds: number[] = [];
  const modes = ["light", "dark"] as const;
  const nextBackground: Record<string, unknown> = { ...background };
  const uploadedBySource = new Map<string, number>();
  const moduleSources = modes.map((mode) => {
    const base = background[mode]?.base as ThemeImageBase | undefined;
    return isPhiThemeModuleImage(base) && base ? String(base.sourceUrl) : null;
  });
  const sharedPicture = moduleSources[0] !== null && moduleSources[0] === moduleSources[1];

  for (const mode of modes) {
    const entry = background[mode];
    const base = entry?.base as ThemeImageBase | undefined;
    if (!isPhiThemeModuleImage(base) || !base) continue;

    const source = String(base.sourceUrl);
    /*
     * The same picture in both modes is one upload. The server would recognise the duplicate by its
     * checksum anyway, but sending it twice to be told so is a waste of the author's wait.
     *
     * Named after the ground it came from, because that is how somebody looking for it in the Media
     * library will think of it: "mountain-forest-bg", or "-light" and "-dark" where the two modes are
     * two pictures. A name that only said "theme ground" would fit every picture this ever uploads.
     */
    const assetId = uploadedBySource.get(source)
      ?? await uploadPhiThemeImage(source, `${composition.ground.key}-bg${sharedPicture ? "" : `-${mode}`}`);
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

/**
 * Takes the Logo a Theme shows into the Site's record, every picture into the Media library.
 *
 * Unlike a ground, a Set's Logo is taken from core as well: the core Set offers the house wordmark, and
 * a Site that saved a Theme showing it has decided to keep it. Both modes are taken, including one the
 * author never switched to -- a Site that kept only the light Logo would change its dark one the day
 * its Set does. What the record already holds stays; a mode set to "none" stays none.
 *
 * Only a picture still carried inline or served from this origin is uploaded, the same rule the ground
 * follows. The same picture in both modes is one upload.
 */
export async function materializePhiThemeBrandLogo<T extends { brand?: PhiSiteThemeBrand | null }>(
  theme: T,
  logoSet: PhiThemeSetBlock,
): Promise<T> {
  const logos = resolvePhiThemeEffectiveLogo(theme.brand?.logo, logoSet);
  if (!logos.light && !logos.dark) return theme;

  const uploadedBySource = new Map<string, number>();
  const sharedPicture = logos.light?.sourceKind === "url" && logos.dark?.sourceKind === "url"
    && logos.light.sourceUrl === logos.dark.sourceUrl;
  const next: { light?: PhiSiteThemeBrandLogo; dark?: PhiSiteThemeBrandLogo } = {};

  for (const mode of ["light", "dark"] as const) {
    const logo = logos[mode];
    if (!logo) continue;
    if (logo.sourceKind !== "url" || !isPhiThemeCarriedSource(logo.sourceUrl)) {
      next[mode] = logo;
      continue;
    }

    const source = logo.sourceUrl;
    let assetId = uploadedBySource.get(source);
    if (assetId === undefined) {
      const file = await readPhiThemeImageFile(source, `${logoSet.key}-logo${sharedPicture ? "" : `-${mode}`}`);
      const result = await runPhiMediaUploadSession(file, undefined, {
        meta: { source: PhiMediaAssetSource.ThemeBrandLogo },
      });
      assetId = result.asset.id;
      uploadedBySource.set(source, assetId);
    }
    next[mode] = { sourceKind: "asset", assetId, url: buildPhiMediaAssetContentDeliveryUrl(assetId) };
  }

  return { ...theme, brand: { ...(theme.brand ?? {}), logo: next } };
}
