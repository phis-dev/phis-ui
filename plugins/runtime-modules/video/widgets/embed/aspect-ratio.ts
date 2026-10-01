/*
 * The aspect ratios a Video Embed offers, apart from `config.ts` because the live client resolves one on
 * every render, and the config module is the parser with the block defaults merge behind it.
 */
export const PHI_VIDEO_EMBED_ASPECT_RATIOS = ["provider", "16:9", "4:3", "1:1", "21:9", "9:16"] as const;

export type PhiVideoEmbedAspectRatio = (typeof PHI_VIDEO_EMBED_ASPECT_RATIOS)[number];

const PHI_VIDEO_EMBED_ASPECT_RATIO_VALUES: Readonly<Record<string, number>> = {
  "16:9": 16 / 9,
  "4:3": 4 / 3,
  "1:1": 1,
  "21:9": 21 / 9,
  "9:16": 9 / 16,
};

export function resolvePhiVideoEmbedAspectRatio(
  configured: PhiVideoEmbedAspectRatio | undefined,
  providerAspectRatio: number,
) {
  return (configured && PHI_VIDEO_EMBED_ASPECT_RATIO_VALUES[configured]) || providerAspectRatio;
}
