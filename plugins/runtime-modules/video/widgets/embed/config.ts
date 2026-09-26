import { PhiCmsWidgetType, resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * What shape the placeholder reserves.
 *
 * `provider` is the default and means "whatever the provider said", which is the answer that stays right
 * when a Site swaps a YouTube link for a Vimeo one. The rest are for a Site that knows better than the
 * provider does, which happens with a vertical cut.
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

export function readPhiVideoEmbedAspectRatio(value: unknown): PhiVideoEmbedAspectRatio {
  const ratio = readString(value);
  return PHI_VIDEO_EMBED_ASPECT_RATIOS.includes(ratio as PhiVideoEmbedAspectRatio)
    ? (ratio as PhiVideoEmbedAspectRatio)
    : "provider";
}

/** The number the placeholder and the player both use, with the provider's own as the fallback. */
export function resolvePhiVideoEmbedAspectRatio(
  configured: PhiVideoEmbedAspectRatio | undefined,
  providerAspectRatio: number,
) {
  return (configured && PHI_VIDEO_EMBED_ASPECT_RATIO_VALUES[configured]) || providerAspectRatio;
}

export type PhiVideoEmbedWidgetConfig = PhiCmsWidgetConfigBase & {
  /**
   * The address of the video, as somebody pasted it.
   *
   * One field rather than a provider and an id, because an address already says both and the registry
   * reads it: swapping providers is pasting a different link. An address no active provider recognises
   * stays here and renders nothing, so removing the Module that served it loses no placement.
   */
  address?: string;
  /** What the placeholder is titled, and what a screen reader announces for the player. */
  title?: string;
  /**
   * The still picture, from the Site's own Media library.
   *
   * Never the provider's thumbnail. Fetching that would be the very request the placeholder exists to
   * postpone ([design/CONSENT.md](../../../../../design/CONSENT.md)), so a Site either has a poster of its
   * own or the placeholder draws a plain surface.
   */
  posterAssetId?: number;
  aspectRatio?: PhiVideoEmbedAspectRatio;
};

export function normalizePhiVideoEmbedWidgetConfig(config: unknown): PhiVideoEmbedWidgetConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      ...readRenderableBlockConfig({}),
      address: undefined,
      title: undefined,
      posterAssetId: undefined,
      aspectRatio: "provider",
    };
  }

  const raw = config as Record<string, unknown>;
  return {
    ...readRenderableBlockConfig(raw),
    address: readString(raw.address),
    title: readString(raw.title),
    posterAssetId: readNumber(raw.posterAssetId),
    aspectRatio: readPhiVideoEmbedAspectRatio(raw.aspectRatio),
  };
}

export function parsePhiVideoEmbedWidgetConfig(config: Record<string, unknown>): PhiVideoEmbedWidgetConfig {
  return normalizePhiVideoEmbedWidgetConfig(config);
}

export const PHI_VIDEO_EMBED_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("video-embed"),
  typeKey: "video-embed",
  slotSizePolicy: "intrinsic",
  title: "Video",
  description: "A video from YouTube, Vimeo, or another provider, fetched only once a visitor asks.",
  category: "media",
  iconFamily: "content",
  fields: [
    { key: "address", type: "url", label: "Video address" },
    { key: "title", type: "string", label: "Title" },
    // A number in the toolbar, the way the Card takes its Asset, until there is a picker to offer here.
    { key: "posterAssetId", type: "number", label: "Poster Asset ID", editorPlacement: "toolbar" },
    {
      key: "aspectRatio",
      type: "choice",
      label: "Aspect ratio",
      options: [
        { value: "provider", label: "From the provider" },
        { value: "16:9", label: "16:9" },
        { value: "4:3", label: "4:3" },
        { value: "1:1", label: "1:1" },
        { value: "21:9", label: "21:9" },
        { value: "9:16", label: "9:16" },
      ],
    },
  ],
  defaultConfig: normalizePhiVideoEmbedWidgetConfig(null),
  parseConfig: parsePhiVideoEmbedWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiVideoEmbedWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "slotSizePolicy"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_VIDEO_EMBED_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.VideoEmbed;
