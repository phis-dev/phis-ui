"use client";

import type { PhiClientBlockBaseProps } from "../../../../../types";
import type { PhiCmsImageWidgetConfig } from "./config";
import { isPhiMediaAssetOriginalOptimizable, isPhiMediaAssetPublic } from "../../../../../constants/media";
import type { PhiMediaAsset } from "../../../../../types/media";
import { resolvePhiImagePresentation } from "../../../../../components/media/image-presentation";
import type { PhiImageWidgetLabels } from "../../../../../components/widgets/label-types/image";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { resolvePhiMaskStyle } from "../../../../../components/widgets/config/mask";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiImageControl } from "../../../../../components/controls/phi-image-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

function formatImageSize(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
}

export type PhiImageWidgetProps = PhiClientBlockBaseProps<
  PhiImageWidgetLabels,
  PhiCmsImageWidgetConfig
> & {
  resolvedAsset?: PhiMediaAsset | null;
  focalRect?: unknown;
  authoringAssetVariantPreview?: boolean;
};

function resolveImageDimension(
  overrideSize: boolean,
  overrideValue: number | string | null | undefined,
  presentedValue: number | null,
) {
  if (overrideSize) {
    return overrideValue ?? presentedValue ?? null;
  }

  return presentedValue ?? null;
}

export function PhiImageWidget({
  labels,
  config,
  resolvedAsset,
  focalRect,
  authoringAssetVariantPreview = false,
}: PhiImageWidgetProps) {
  const { token } = usePhiConfig();
  const sourceKind = config?.sourceKind ?? "url";
  const configAssetId = config?.sourceKind === "asset" ? config.assetId : undefined;
  const configVariantKey = config?.sourceKind === "asset" ? config.variantKey : undefined;
  const configVariantVersion = config?.sourceKind === "asset" ? config.variantVersion : undefined;
  const configSourceUrl = config?.sourceKind !== "asset" && typeof config?.sourceUrl === "string"
    ? config.sourceUrl
    : undefined;
  const presentation = resolvePhiImagePresentation({
    sourceKind,
    assetId: resolvedAsset?.id ?? configAssetId,
    variantKey: configVariantKey,
    variantVersion: resolvedAsset?.variantVersion ?? configVariantVersion,
    deliveryRevision: resolvedAsset?.deliveryRevision,
    originalUrl: resolvedAsset?.deliveryUrl,
    sourceUrl: configSourceUrl,
    focalRect: focalRect ?? resolvedAsset?.meta?.focalRect,
    fit: config?.fit,
    objectPosition: config?.objectPosition,
    sourceWidth: resolvedAsset?.width,
    sourceHeight: resolvedAsset?.height,
    simulateVariantCrop: authoringAssetVariantPreview,
  });
  const renderUrl = presentation.url;
  const overrideSize = config?.imageSize != null;
  const width = resolveImageDimension(overrideSize, config?.imageSize?.width, presentation.width);
  const height = resolveImageDimension(overrideSize, config?.imageSize?.height, presentation.height);
  const alt = (sourceKind === "asset"
    ? (resolvedAsset?.altText ?? "")
    : (config?.alt ?? resolvedAsset?.altText ?? "")).trim();
  const title = (sourceKind === "asset"
    ? (resolvedAsset?.title ?? "")
    : (config?.title ?? resolvedAsset?.title ?? "")).trim();
  const isPublicAsset = isPhiMediaAssetPublic(
    resolvedAsset?.deliveryPolicy,
    resolvedAsset?.lifecycleStatus,
  );
  /*
   * A generated variant is raster and optimisable whenever the Asset is public; the original is the
   * Asset's own bytes, which the optimiser refuses for an SVG.
   */
  const optimizable = presentation.kind === "generated-variant"
    ? isPublicAsset
    : resolvedAsset != null && isPhiMediaAssetOriginalOptimizable(resolvedAsset);
  const renderedWidth = formatImageSize(width);
  const renderedHeight = formatImageSize(height);
  const maskStyle = resolvePhiMaskStyle(config?.mask);
  const radiusStyle = {
    borderTopLeftRadius: config?.borderTopLeftRadius,
    borderTopRightRadius: config?.borderTopRightRadius,
    borderBottomLeftRadius: config?.borderBottomLeftRadius,
    borderBottomRightRadius: config?.borderBottomRightRadius,
  } as const;

  if (!renderUrl) {
    return (
      <PhiFlexControl
        align="center"
        justify="center"
        vertical
        gap={6}
        style={{
          minHeight: 160,
          width: renderedWidth ?? "100%",
          height: renderedHeight,
          ...radiusStyle,
          border: `1px dashed ${token.colorBorderSecondary}`,
          background: token.colorBgContainer,
          color: token.colorTextSecondary,
          padding: token.paddingLG,
          textAlign: "center",
        }}
      >
        {/* The picture alone: the two lines below are this Widget's own wording, not an empty state's. */}
        <PhiEmptyControl />
        <PhiTypographyControl type="secondary" strong={false}>
          {labels.emptyTitle}
        </PhiTypographyControl>
        <PhiTypographyControl type="secondary">{labels.emptyDescription}</PhiTypographyControl>
      </PhiFlexControl>
    );
  }

  return (
    <PhiImageControl
      presentation={presentation}
      source={sourceKind === "asset" ? "asset" : config?.trusted === true ? "trusted-url" : "url"}
      alt={alt}
      title={title || undefined}
      width={width}
      height={height}
      blurDataUrl={resolvedAsset?.blurDataUrl}
      optimizable={optimizable}
      sizes={config?.sizes}
      preload={config?.preload === true && isPublicAsset}
      preview={(config?.previewMode ?? "none") === "lightbox"}
      style={{
        ...radiusStyle,
        ...maskStyle,
        overflow: presentation.simulatedCropStyle || Object.values(radiusStyle).some((value) => value != null)
          ? "hidden"
          : undefined,
      }}
      imageStyle={radiusStyle}
    />
  );
}
