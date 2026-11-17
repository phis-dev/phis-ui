import type { PhiSiteThemeBrandSignet } from "../types/site-theme";

/** A Signet picture the Site can deliver: inline as a data URL, or an Asset of its Media library. */
export type PhiThemeSignetPicture =
  | { kind: "data"; source: string }
  | { kind: "asset"; assetId: number };

/**
 * The Signet a Site wears, and whose it is: `site` where the record states it (a save made it the
 * Site's, `materializePhiThemeBrandSignet`), `set` where the Site only follows a Theme Set that has one.
 */
export type PhiThemeSignet = PhiThemeSignetPicture & { from: "site" | "set" };

/**
 * The Signet the record itself states, and nothing else.
 *
 * Kept apart from the Set resolution so the route that delivers it can read the record without the
 * Theme blocks: a Set's Signet has no address of its own and is named by the head as a data URL. Only a
 * picture that can be delivered counts: an Asset with a positive id, or an inline `data:image/` picture.
 * Anything else -- a path, an address on another server -- says nothing, and the answer is none.
 */
export function readPhiThemeSiteSignet(authored: PhiSiteThemeBrandSignet | null | undefined): PhiThemeSignetPicture | null {
  if (authored?.sourceKind === "asset" && Number.isInteger(authored.assetId) && authored.assetId > 0) {
    return { kind: "asset", assetId: authored.assetId };
  }
  if (authored?.sourceKind === "url" && typeof authored.sourceUrl === "string" && authored.sourceUrl.startsWith("data:image/")) {
    return { kind: "data", source: authored.sourceUrl };
  }
  return null;
}
