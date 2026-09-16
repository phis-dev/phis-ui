import {
  formatPhiUnicodeRange,
  resolvePhiFontSubsetRanges,
  type PhiFontMetrics,
} from "@phis/contracts/media";

import { buildPhiFontSubsetDeliveryUrl } from "../constants/media";

/**
 * The two `@font-face` rules a Site-owned typeface needs, and the family stack that uses them.
 *
 * A font from the Media library cannot go through `next/font`, which is a build-time loader, so nothing
 * writes its rules but this. The first rule is the face itself. The second is the one that matters
 * before it arrives: a local substitute, re-proportioned with `size-adjust` and the three overrides so
 * the page it paints is the page the real font will paint. Without it the substitute sets at its own
 * proportions and every line moves when the file lands -- measured on the three families this package
 * ships, a substitute runs between 3% and 35% off.
 */

/**
 * What a browser is asked to stand in with, and how those faces measure.
 *
 * Three fonts that are on essentially every desktop, one per category. The numbers are the published
 * metrics of those faces -- the same figures `next/font` computes its own overrides against -- and they
 * are constants here because a server cannot measure a font on somebody else's machine.
 */
const PHI_LOCAL_FALLBACK_FONTS = {
  "sans-serif": { name: "Arial", unitsPerEm: 2048, xWidthAvg: 913 },
  serif: { name: "Times New Roman", unitsPerEm: 2048, xWidthAvg: 832 },
  monospace: { name: "Courier New", unitsPerEm: 2048, xWidthAvg: 1229 },
} as const;

export type PhiFontFaceCategory = keyof typeof PHI_LOCAL_FALLBACK_FONTS;

export type PhiFontFaceSource = {
  /** The family the CSS declares and the stack asks for. */
  family: string;
  /** Where the file is, already a delivery URL. */
  url: string;
  contentType: string;
  metrics: PhiFontMetrics | null;
  /** What to stand in with where the file does not classify itself. */
  fallbackCategory?: PhiFontFaceCategory;
  /**
   * The Asset behind `url`, for a font whose unicode cuts are known. With it, the face is declared once
   * per cut with `unicode-range`, and a page fetches only the cuts it renders; without it, whole.
   */
  asset?: { id: number; deliveryRevision?: number | null };
};

/**
 * A CSS string that cannot leave the value it was written for.
 *
 * Family names come out of a font file somebody uploaded and URLs are built from stored keys; both end
 * up inside a stylesheet, so both are reduced to what a name and a URL can legitimately contain. A
 * quote or a brace would not merely look wrong, it would end the rule and begin another.
 */
function cssSafeFamily(family: string) {
  return family.replace(/[^\w \-.]/g, "").trim().slice(0, 96);
}

function cssSafeUrl(url: string) {
  return url.replace(/[^\w\-./?&=:%~+]/g, "");
}

/** What `src` calls the file, which is not what the wire calls it. */
function fontFormat(contentType: string) {
  const normalized = contentType.trim().toLowerCase().split(";", 1)[0]!.trim();
  if (normalized === "font/woff2") return "woff2";
  if (normalized === "font/woff" || normalized === "application/font-woff") return "woff";
  if (normalized === "font/otf" || normalized === "application/x-font-otf") return "opentype";
  if (normalized === "font/ttf" || normalized === "application/x-font-ttf") return "truetype";
  if (normalized === "font/collection") return "collection";
  return null;
}

/** The name of the re-proportioned substitute; `Lora Fallback` beside `Lora`, as next/font names it. */
export function buildPhiFontFallbackFamily(family: string) {
  return `${cssSafeFamily(family)} Fallback`;
}

function percent(value: number) {
  return `${Math.abs(value * 100).toFixed(2)}%`;
}

/**
 * The substitute, re-proportioned.
 *
 * `size-adjust` is the ratio of the two faces' running-text widths, and the three overrides then state
 * the real font's vertical extents *on the adjusted em*, which is why each is divided by the adjustment
 * as well. A font whose width could not be measured gets no adjustment rather than a guessed one: the
 * vertical corrections are still worth having on their own.
 */
function buildFallbackFace(source: PhiFontFaceSource, category: PhiFontFaceCategory) {
  const metrics = source.metrics;
  if (!metrics || metrics.unitsPerEm <= 0) return null;
  const fallback = PHI_LOCAL_FALLBACK_FONTS[category];
  const ownWidth = metrics.xWidthAvg ? metrics.xWidthAvg / metrics.unitsPerEm : null;
  const fallbackWidth = fallback.xWidthAvg / fallback.unitsPerEm;
  const sizeAdjust = ownWidth ? ownWidth / fallbackWidth : 1;
  const scale = metrics.unitsPerEm * sizeAdjust;
  return [
    `@font-face{font-family:"${buildPhiFontFallbackFamily(source.family)}";`,
    `src:local("${fallback.name}");`,
    `ascent-override:${percent(metrics.ascent / scale)};`,
    `descent-override:${percent(metrics.descent / scale)};`,
    `line-gap-override:${percent(metrics.lineGap / scale)};`,
    `size-adjust:${percent(sizeAdjust)}}`,
  ].join("");
}

export function resolvePhiFontFaceCategory(source: PhiFontFaceSource): PhiFontFaceCategory {
  return source.metrics?.category ?? source.fallbackCategory ?? "sans-serif";
}

/**
 * One face per unicode cut the font was recorded to have, or null to declare it whole.
 *
 * Every cut is woff2 whatever was uploaded, and every range is written from numbers the contract or the
 * upload reader produced -- so nothing a file said reaches this rule but the family name, which is
 * reduced before it gets here.
 */
function buildPhiFontSubsetFaces(source: PhiFontFaceSource, family: string) {
  const coverage = source.metrics?.coverage;
  if (!source.asset || !coverage || coverage.subsets.length === 0) return null;
  const faces = coverage.subsets.flatMap((key) => {
    const url = buildPhiFontSubsetDeliveryUrl(source.asset!.id, key, source.asset!.deliveryRevision);
    const ranges = resolvePhiFontSubsetRanges(key, coverage);
    if (!url || ranges.length === 0) return [];
    return [
      `@font-face{font-family:"${family}";src:url("${cssSafeUrl(url)}") format("woff2");`
        + `unicode-range:${formatPhiUnicodeRange(ranges)};font-display:swap}`,
    ];
  });
  return faces.length > 0 ? faces.join("") : null;
}

/**
 * Both rules for one Site-owned face, or nothing where the file is not one we can name a format for.
 *
 * `font-display: swap` rather than `block`: the substitute below is proportioned to stand in, so
 * showing it immediately costs a repaint and hiding the text would cost the reader the sentence.
 */
export function buildPhiFontFaceCss(source: PhiFontFaceSource) {
  const family = cssSafeFamily(source.family);
  const url = cssSafeUrl(source.url);
  const format = fontFormat(source.contentType);
  if (!family || !url || !format) return null;
  const fallback = buildFallbackFace({ ...source, family }, resolvePhiFontFaceCategory(source));
  const faces = buildPhiFontSubsetFaces(source, family)
    ?? `@font-face{font-family:"${family}";src:url("${url}") format("${format}");font-display:swap}`;
  return fallback ? `${faces}${fallback}` : faces;
}

/**
 * What a `font-family` declaration should say once both rules exist.
 *
 * The adjusted substitute stands between the real face and the generic, so the browser reaches it
 * before falling all the way through to whatever the platform would have picked unproportioned.
 */
export function buildPhiFontFamilyStack(source: PhiFontFaceSource) {
  const family = cssSafeFamily(source.family);
  if (!family) return null;
  const category = resolvePhiFontFaceCategory(source);
  const stack = [`"${family}"`];
  if (source.metrics) stack.push(`"${buildPhiFontFallbackFamily(family)}"`);
  stack.push(category);
  return stack.join(", ");
}
