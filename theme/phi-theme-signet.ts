import type { PhiSiteThemeBrandSignet } from "../types/site-theme";

/** A media type the head may state: an image type as the Core writes it, nothing with parameters. */
const PHI_SIGNET_CONTENT_TYPE = /^image\/[a-z0-9][a-z0-9.+-]*$/u;

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * The revision in the address the Core delivers an Asset at, `/api/site/media/<id>/content?r=<revision>`.
 * Only that address for this Asset counts: anything else (a path elsewhere, another id, a missing or
 * non-numeric `r`) states no revision, and the Signet is named as it was before the Core wrote one.
 */
function readPhiSignetAssetRevision(url: string | null | undefined, assetId: number): number | null {
  if (typeof url !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(url, "http://signet.invalid");
  } catch {
    return null;
  }
  if (parsed.origin !== "http://signet.invalid" || parsed.pathname !== `/api/site/media/${assetId}/content`) return null;
  const revision = parsed.searchParams.get("r");
  return revision !== null && /^\d{1,15}$/u.test(revision) ? Number(revision) : null;
}

/** A Signet picture the Site can deliver: inline as a data URL, or an Asset of its Media library. */
export type PhiThemeSignetPicture =
  | { kind: "data"; source: string }
  | {
    kind: "asset";
    assetId: number;
    /** The Asset's revision, read from the delivered address the Core resolved (`?r=<revision>`). */
    revision?: number;
    /** The picture's media type and size as the Core states them, where it does. */
    contentType?: string;
    width?: number;
    height?: number;
  };

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
    const revision = readPhiSignetAssetRevision(authored.url, authored.assetId);
    const contentType = typeof authored.contentType === "string" && PHI_SIGNET_CONTENT_TYPE.test(authored.contentType)
      ? authored.contentType
      : null;
    const sized = isPositiveInteger(authored.width) && isPositiveInteger(authored.height);
    return {
      kind: "asset",
      assetId: authored.assetId,
      ...(revision != null ? { revision } : {}),
      ...(contentType ? { contentType } : {}),
      ...(sized ? { width: authored.width as number, height: authored.height as number } : {}),
    };
  }
  if (authored?.sourceKind === "url" && typeof authored.sourceUrl === "string" && authored.sourceUrl.startsWith("data:image/")) {
    return { kind: "data", source: authored.sourceUrl };
  }
  return null;
}
