"use client";

import { buildPhiMediaAssetContentDeliveryUrl } from "../../../constants/media";
import { resolvePhiImagePresentation } from "../../media/image-presentation";
import { usePhiAuthoringAssetDetails } from "../../media/use-authoring-asset-details";
import type { PhiCmsCardWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/card/config";
import { PhiCardWidgetClient } from "../../../plugins/runtime-modules/core/widgets/card/client";

export type PhiCardWidgetEditorProps = {
  config: PhiCmsCardWidgetConfig;
  title?: string;
};

/**
 * The Editor draws the Card through the same presentation resolver the server render uses. Reading
 * the authoring Asset is what keeps the two equivalent: without the delivery revision the Editor
 * would keep the crop that was cached before a focal change while Live already shows the new one.
 */
export function PhiCardWidgetEditor({ config, title }: PhiCardWidgetEditorProps) {
  const assetId = config.sourceKind === "asset" ? config.assetId ?? null : null;
  const asset = usePhiAuthoringAssetDetails(assetId);
  const presentation = resolvePhiImagePresentation({
    sourceKind: config.sourceKind,
    assetId,
    variantKey: config.sourceKind === "asset" ? config.variantKey : null,
    variantVersion: asset?.variantVersion ?? (config.sourceKind === "asset" ? config.variantVersion : null),
    deliveryRevision: asset?.deliveryRevision,
    originalUrl: assetId == null ? null : buildPhiMediaAssetContentDeliveryUrl(assetId),
    sourceUrl: typeof config.sourceUrl === "string" ? config.sourceUrl : undefined,
    focalRect: asset?.meta?.focalRect,
    sourceWidth: asset?.width,
    sourceHeight: asset?.height,
  });

  return (
    <PhiCardWidgetClient
      labels={{
        eyebrow: config.eyebrow,
        title: config.title ?? title,
        description: config.description,
        meta: config.meta,
        actionLabel: config.actionLabel,
      }}
      config={{
        imageUrl: presentation.url ?? undefined,
        imageFit: presentation.fit,
        imagePosition: presentation.objectPosition,
        alt: config.alt,
        blurDataUrl: config.blurDataUrl,
        href: config.href,
        newTab: config.newTab,
        actionHref: config.actionHref,
        actionNewTab: config.actionNewTab,
        variant: config.variant,
        highlight: config.highlight,
      }}
    />
  );
}
