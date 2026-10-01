import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { isPhiVideoProviderKey, type PhiVideoProviderKey } from "../../../../../types/video";
import {
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import { PHI_VIDEO_EMBED_ASPECT_RATIOS, type PhiVideoEmbedAspectRatio } from "./aspect-ratio";

/**
 * What shape the placeholder reserves.
 *
 * `provider` is the default and means "whatever the provider said", which is the answer that stays right
 * when a Site swaps a YouTube video for a Vimeo one. The rest are for a Site that knows better than the
 * provider does, which happens with a vertical cut.
 */
export function readPhiVideoEmbedAspectRatio(value: unknown): PhiVideoEmbedAspectRatio {
  const ratio = readString(value);
  return PHI_VIDEO_EMBED_ASPECT_RATIOS.includes(ratio as PhiVideoEmbedAspectRatio)
    ? (ratio as PhiVideoEmbedAspectRatio)
    : "provider";
}

/** The number the placeholder and the player both use, with the provider's own as the fallback. */
function readPhiVideoProviderKey(value: unknown): PhiVideoProviderKey | undefined {
  const key = readString(value);
  // Shape only. Whether the provider is *active* is a question for the Area, and a key whose Module is
  // switched off has to survive here so switching it back on finds the video again.
  return key && isPhiVideoProviderKey(key) ? key : undefined;
}

export type PhiVideoEmbedWidgetConfig = PhiCmsWidgetConfigBase & {
  /**
   * Where the video comes from, chosen from the providers the Area activates.
   *
   * Stored rather than derived from an address, so the render path never has to guess: the provider is
   * the recipient the placeholder names, and guessing it from a link would make what a visitor is told
   * depend on which Modules happen to be on.
   */
  providerKey?: PhiVideoProviderKey;
  /**
   * The video's id at that provider -- `dQw4w9WgXcQ`, `76979871`.
   *
   * The id, not an address. A pasted link carries a playlist, a timestamp, a `si=` from the share dialog,
   * sometimes a comment id belonging to whoever copied it, and all of that would be published with the
   * page. A whole link typed here is still read, but what is kept is the id.
   */
  videoId?: string;
  /**
   * Extra playback parameters, as a query string: `start=90`, `h=3f9a1c`.
   *
   * The names are the provider's own and are not translated -- YouTube wants `start=90`, an unlisted
   * Vimeo video wants `h=`. Nothing here can move the request: the host comes from the provider, and the
   * parameters the provider always sends (`dnt`, `autoplay`) win every collision.
   */
  params?: string;
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
      providerKey: undefined,
      videoId: undefined,
      params: undefined,
      title: undefined,
      posterAssetId: undefined,
      aspectRatio: "provider",
    };
  }

  const raw = config as Record<string, unknown>;
  return {
    ...readRenderableBlockConfig(raw),
    providerKey: readPhiVideoProviderKey(raw.providerKey),
    videoId: readString(raw.videoId),
    params: readString(raw.params),
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
  /*
   * The frame spans its slot and the aspect ratio decides the height, the way the Card does.
   *
   * Not `intrinsic`: an intrinsic slot is `width: fit-content`, and a frame that is `width: 100%` plus an
   * aspect ratio has no content to be measured against. It collapses to nothing -- present in the HTML,
   * zero by zero on the page.
   */
  slotSizePolicy: "fill-inline",
  title: "Video",
  description: "A video from YouTube, Vimeo, or another provider, fetched only once a visitor asks.",
  category: "media",
  iconFamily: "content",
  fields: [
    { key: "providerKey", type: "video-provider", label: "Provider" },
    {
      key: "videoId",
      type: "string",
      label: "Video ID",
      description: "The identifier at that provider. A whole link works too; only the id is kept.",
    },
    {
      key: "params",
      type: "string",
      label: "Playback parameters",
      description: "The provider's own, as a query string: start=90, h=3f9a1c.",
    },
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
