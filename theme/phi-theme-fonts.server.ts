import "server-only";

import { resolveSiteInternalReferences } from "../gateway/internal-references";
import { readPhiInternalReference } from "../types/references";
import {
  buildPhiFontFaceCss,
  buildPhiFontFamilyStack,
  type PhiFontFaceCategory,
} from "./phi-font-face";

/**
 * Turns the Assets a Theme names in its font slots into rules a page can render with.
 *
 * A slot holds either a family name -- a catalogue family, or one the viewer happens to have -- or a
 * `phis:asset/<id>` reference to a typeface the Site owns. Only the second needs anything done: the
 * Asset is resolved to a delivery URL and the metrics read at upload, and out of those come the two
 * `@font-face` rules and the family stack that uses them.
 *
 * It runs where the Root Background's projection runs and for the same reason: the Theme record is not
 * a CMS tree, so the tree's reference projection never sees it.
 *
 * A reference that does not resolve, or resolves to something that is not a font, leaves the slot as it
 * was. A Theme pointing at a deleted Asset then renders in the generic family rather than in nothing --
 * and the Asset cannot be deleted while a Theme names it, because the delete guard reads Theme
 * revisions for exactly these references.
 */

/** What each slot stands in with where the file classifies itself as nothing. */
const PHI_THEME_FONT_SLOT_CATEGORIES = {
  body: "sans-serif",
  mono: "monospace",
  serif: "serif",
  accent: "sans-serif",
  display: "sans-serif",
} as const satisfies Record<string, PhiFontFaceCategory>;

export type PhiThemeFontSlot = keyof typeof PHI_THEME_FONT_SLOT_CATEGORIES;

export type PhiResolvedThemeFonts = {
  /** The `@font-face` rules for every Site-owned family in use, or an empty string. */
  css: string;
  /** Per slot, the stack to declare -- absent where the slot names no Asset. */
  families: Partial<Record<PhiThemeFontSlot, string>>;
};

const PHI_NO_THEME_FONTS: PhiResolvedThemeFonts = { css: "", families: {} };

export async function resolvePhiSiteThemeFonts(
  fonts: Partial<Record<PhiThemeFontSlot, string | null>> | null | undefined,
  {
    apiBaseUrl,
    internalToken,
    siteKey,
  }: { apiBaseUrl: string; internalToken: string; siteKey: string },
): Promise<PhiResolvedThemeFonts> {
  if (!fonts) return PHI_NO_THEME_FONTS;

  const slots = (Object.keys(PHI_THEME_FONT_SLOT_CATEGORIES) as PhiThemeFontSlot[])
    .map((slot) => {
      const reference = readPhiInternalReference(fonts[slot]);
      return reference?.kind === "asset" ? { slot, assetId: reference.assetId } : null;
    })
    .filter((entry): entry is { slot: PhiThemeFontSlot; assetId: number } => entry != null);
  if (slots.length === 0) return PHI_NO_THEME_FONTS;

  const projection = await resolveSiteInternalReferences({
    apiBaseUrl,
    internalToken,
    siteKey,
    assetIds: [...new Set(slots.map((entry) => entry.assetId))],
  });

  const rules = new Map<number, string>();
  const families: Partial<Record<PhiThemeFontSlot, string>> = {};
  for (const { slot, assetId } of slots) {
    const asset = projection.assets.get(assetId);
    if (!asset || asset.kind !== "font") continue;
    /*
     * The family the file states, and the Asset's title only where it states none. Neither is allowed
     * to be empty, because the name is what every later declaration refers to.
     */
    const family = asset.font?.familyName?.trim() || asset.title?.trim() || asset.originalName.trim();
    const source = {
      family,
      url: asset.deliveryUrl,
      contentType: asset.contentType,
      metrics: asset.font,
      fallbackCategory: PHI_THEME_FONT_SLOT_CATEGORIES[slot],
      asset: { id: asset.id, deliveryRevision: asset.deliveryRevision },
    };
    const css = buildPhiFontFaceCss(source);
    const stack = buildPhiFontFamilyStack(source);
    if (!css || !stack) continue;
    // One Asset in two slots is one pair of rules; the stack is the same string either way.
    rules.set(assetId, css);
    families[slot] = stack;
  }

  return { css: [...rules.values()].join(""), families };
}
