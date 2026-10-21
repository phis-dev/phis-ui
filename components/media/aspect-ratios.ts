/**
 * The proportions a frame for pictures is offered in, stored as `width:height`.
 *
 * A closed list rather than a text box: a ratio somebody types is a ratio nobody checks, and the few a
 * page actually needs are the ones a camera, a screen and a print already use.
 */
export const PHI_MEDIA_ASPECT_RATIOS = ["16:9", "3:2", "4:3", "1:1", "3:4", "2:3", "9:16", "21:9"] as const;

export type PhiMediaAspectRatio = (typeof PHI_MEDIA_ASPECT_RATIOS)[number];

export const PHI_MEDIA_ASPECT_RATIO_OPTIONS = PHI_MEDIA_ASPECT_RATIOS.map((ratio) => ({ value: ratio, label: ratio }));

/** The ratio as CSS `aspect-ratio` writes it. */
export function resolvePhiMediaAspectRatioCss(ratio: PhiMediaAspectRatio): string {
  const [width, height] = ratio.split(":");
  return `${width} / ${height}`;
}
