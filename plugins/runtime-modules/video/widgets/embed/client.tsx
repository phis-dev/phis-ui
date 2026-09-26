"use client";

import { usePhiRuntimeModuleState } from "../../../../../components/runtime/runtime-module-context";
import { PhiVideoEmbedControl } from "../../../../../components/controls/phi-video-embed-control";
import type { PhiClientBlockBaseProps } from "../../../../../types";
import type { PhiVideoWidgetLabels } from "../../../../../components/widgets/label-sets/video";
import { buildPhiVideoEmbedUrl, resolvePhiVideoAddress } from "../../../../../types/video";
import {
  resolvePhiVideoEmbedAspectRatio,
  type PhiVideoEmbedWidgetConfig,
} from "./config";

export type PhiVideoEmbedWidgetClientProps = PhiClientBlockBaseProps<
  PhiVideoWidgetLabels,
  PhiVideoEmbedWidgetConfig
> & {
  poster?: { url: string; unoptimized?: boolean } | null;
};

/**
 * Resolves the stored address against the providers the Area actually has.
 *
 * On the Client rather than in the Server half, because the registry lives in the runtime-module context
 * and a Widget's Server renderer is handed a runtime, not a Module set. It costs nothing: the descriptors
 * are already there as props, this component renders on the Server too, so the placeholder and its notice
 * are in the first HTML -- including the shared static one, which reads no request at all.
 *
 * A Site whose Video Module was switched off resolves to nothing and renders nothing. The address stays
 * in the placement, which is what lets somebody switch the Module back on and find their video again.
 */
export function PhiVideoEmbedWidgetClient({ labels, config, poster }: PhiVideoEmbedWidgetClientProps) {
  const { videoProviderDescriptorsByKey } = usePhiRuntimeModuleState();
  const resolved = resolvePhiVideoAddress([...videoProviderDescriptorsByKey.values()], config?.address);

  if (!resolved) {
    return null;
  }

  return (
    <PhiVideoEmbedControl
      embedUrl={buildPhiVideoEmbedUrl(resolved.provider, resolved.videoId)}
      title={config?.title?.trim() || resolved.provider.title}
      recipient={resolved.provider.recipient}
      privacyUrl={resolved.provider.privacyUrl}
      aspectRatio={resolvePhiVideoEmbedAspectRatio(config?.aspectRatio, resolved.provider.aspectRatio)}
      poster={poster ?? null}
      labels={labels}
    />
  );
}
