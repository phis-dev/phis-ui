"use client";

import { usePhiRuntimeModuleState } from "../../../../../components/runtime/runtime-module-context";
import { PhiVideoEmbedControl } from "../../../../../components/controls/phi-video-embed-control";
import type { PhiClientBlockBaseProps } from "../../../../../types";
import type { PhiVideoWidgetLabels } from "../../../../../components/widgets/label-sets/video";
import {
  buildPhiVideoEmbedUrl,
  parsePhiVideoEmbedParams,
  resolvePhiVideoId,
} from "../../../../../types/video";
import { resolvePhiVideoEmbedAspectRatio } from "./aspect-ratio";
import type { PhiVideoEmbedWidgetConfig } from "./config";

export type PhiVideoEmbedWidgetClientProps = PhiClientBlockBaseProps<
  PhiVideoWidgetLabels,
  PhiVideoEmbedWidgetConfig
> & {
  poster?: { url: string; unoptimized?: boolean } | null;
};

/**
 * Looks the stored provider up in the registry the Area actually has.
 *
 * On the Client rather than in the Server half, because the registry lives in the runtime-module context
 * and a Widget's Server renderer is handed a runtime, not a Module set. It costs nothing: the descriptors
 * are already there as props, this component renders on the Server too, so the placeholder and its notice
 * are in the first HTML -- including the shared static one, which reads no request at all.
 *
 * A Site whose Video Module was switched off finds no provider and renders nothing. The provider and the
 * id stay in the placement, which is what lets somebody switch the Module back on and find their video
 * again.
 */
export function PhiVideoEmbedWidgetClient({ labels, config, poster }: PhiVideoEmbedWidgetClientProps) {
  const { videoProviderDescriptorsByKey } = usePhiRuntimeModuleState();
  const provider = config?.providerKey ? videoProviderDescriptorsByKey.get(config.providerKey) : undefined;
  const videoId = provider ? resolvePhiVideoId(provider, config?.videoId) : null;

  if (!provider || !videoId) {
    return null;
  }

  const { accepted } = parsePhiVideoEmbedParams(provider, config?.params);

  return (
    <PhiVideoEmbedControl
      embedUrl={buildPhiVideoEmbedUrl(provider, videoId, accepted)}
      providerKey={provider.key}
      title={config?.title?.trim() || provider.title}
      recipient={provider.recipient}
      privacyUrl={provider.privacyUrl}
      aspectRatio={resolvePhiVideoEmbedAspectRatio(config?.aspectRatio, provider.aspectRatio)}
      poster={poster ?? null}
      labels={labels}
    />
  );
}
