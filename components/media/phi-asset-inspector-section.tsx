"use client";

import { CopyOutlined } from "@ant-design/icons";
import { Flex, Typography } from "antd";
import NextImage from "next/image";
import type { CSSProperties } from "react";

import {
  PhiImageAssetVariantKeyName,
  PhiMediaKind,
  isPhiMediaAssetPublic,
  resolvePhiImageAssetVariantSpec,
} from "../../constants/media";
import type { PhiImageAssetVariantKeyValue, PhiMediaAsset } from "../../types/media";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiSelectControl } from "../controls/phi-select-control";
import { PhiTagControl } from "../controls/phi-tag-control";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiMediaKindIcon } from "./phi-media-kind-icon";
import { resolvePhiMediaAssetDisplayDimensions } from "./phi-image-preview-data";
import type { PhiAssetWidgetLabels } from "./media-widget-labels";
import type { MediaFocalRect } from "./focal-rect";
import { resolveFocalRectCoverImageStyle } from "./focal-rect";
import { resolvePhiImagePresentation } from "./image-presentation";

function formatBytes(bytes: number | null | undefined) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function resolveAssetTypeLabel(contentType: string) {
  const [, subtype] = contentType.trim().toLowerCase().split("/", 2);
  return subtype?.split(";", 1)[0]?.trim() || contentType.trim() || null;
}

function resolvePreviewFrame(
  asset: PhiMediaAsset,
  selectedVariantKey: PhiImageAssetVariantKeyValue | null,
) {
  if (asset.kind !== PhiMediaKind.Image) return null;
  const variant = selectedVariantKey == null ? null : resolvePhiImageAssetVariantSpec(selectedVariantKey);
  if (variant) {
    return {
      width: variant.width,
      height: variant.height,
      fit: variant.fit,
      fitAxis: variant.width >= variant.height ? "width" as const : "height" as const,
      fixedCropBox: variant.width === variant.height && variant.width <= 256 ? variant.width : null,
      label: `${variant.width} × ${variant.height}`,
      kindLabel: resolveAssetTypeLabel(asset.contentType) ?? asset.kind,
    };
  }
  const displayDimensions = resolvePhiMediaAssetDisplayDimensions(asset);
  const width = displayDimensions?.width ?? asset.width ?? null;
  const height = displayDimensions?.height ?? asset.height ?? null;
  return {
    width,
    height,
    fit: "contain" as const,
    fitAxis: width && height && height > width ? "height" as const : "width" as const,
    fixedCropBox: null,
    label: width && height ? `${width} × ${height}` : resolveAssetTypeLabel(asset.contentType),
    kindLabel: resolveAssetTypeLabel(asset.contentType) ?? asset.kind,
  };
}

function resolveOverlayTagStyle(background: string, color: string, borderColor: string) {
  return {
    background: `color-mix(in srgb, ${background} 68%, transparent)`,
    color,
    borderColor: `color-mix(in srgb, ${borderColor} 68%, transparent)`,
    zIndex: 2,
  } as const;
}

export function PhiAssetInspectorSection({
  section,
  asset,
  selectedVariantKey,
  sitePublicUrl,
  onVariantKeyChange,
  labels,
  focalRect,
  onFocalRectOpen,
}: {
  section: "preview" | "technical";
  asset: PhiMediaAsset;
  selectedVariantKey: PhiImageAssetVariantKeyValue | null;
  sitePublicUrl?: string | null;
  onVariantKeyChange?: (value: PhiImageAssetVariantKeyValue | null) => void;
  labels: Pick<PhiAssetWidgetLabels, "inspector" | "editor">;
  focalRect: MediaFocalRect | null;
  onFocalRectOpen?: () => void;
}) {
  const { token } = usePhiConfig();
  const overlayTagStyle = resolveOverlayTagStyle(
    token.colorBgContainer,
    token.colorText,
    token.colorBorderSecondary,
  );
  const copy = (value: string) => { void navigator.clipboard.writeText(value); };
  if (section === "technical") {
    const deliveryUrl = new URL(asset.deliveryUrl, sitePublicUrl || window.location.origin).toString();
    const technicalValues = [
      [labels.inspector.publicUrlLabel, deliveryUrl],
      [labels.inspector.contentTypeLabel, asset.contentType],
      [labels.inspector.originalNameLabel, asset.originalName],
    ] as const;
    return (
      <Flex vertical gap="small" style={{ width: "100%", minWidth: 0 }}>
        {technicalValues.map(([label, value]) => (
          <Flex key={label} vertical gap={2} style={{ minWidth: 0 }}>
            <Typography.Text type="secondary">{label}</Typography.Text>
            <Flex align="center" gap="small" style={{ minWidth: 0 }}>
              <Typography.Text code ellipsis style={{ flex: "1 1 auto", minWidth: 0 }}>{value}</Typography.Text>
              <PhiButtonControl ariaLabel={labels.inspector.copyLabelTemplate.replace("%1", label)} type="text" size="small" icon={<CopyOutlined />} onClick={() => copy(value)} />
            </Flex>
          </Flex>
        ))}
      </Flex>
    );
  }

  const previewFrame = resolvePreviewFrame(asset, selectedVariantKey);
  const isOriginalSelection = selectedVariantKey == null;
  const originalCoverImageStyle = asset.kind === PhiMediaKind.Image
    ? resolveFocalRectCoverImageStyle(asset.width, asset.height, 4, 3, focalRect)
    : null;
  /*
   * The Inspector shows the variant BEFORE the server has regenerated it: the focal rectangle here is the
   * one being authored, while the stored variant still carries the previous framing. So it draws the
   * original and reproduces the crop locally -- which is what `simulateVariantCrop` names, and routing it
   * through the shared resolver is what keeps this preview from drifting away from the live render.
   * A `contain` variant letterboxes rather than crops, and the resolver answers with no crop style there.
   */
  const variantPresentation = asset.kind === PhiMediaKind.Image && selectedVariantKey != null
    ? resolvePhiImagePresentation({
        sourceKind: "asset",
        assetId: asset.id,
        variantKey: selectedVariantKey,
        variantVersion: asset.variantVersion,
        deliveryRevision: asset.deliveryRevision,
        originalUrl: asset.deliveryUrl,
        focalRect,
        sourceWidth: asset.width,
        sourceHeight: asset.height,
        simulateVariantCrop: true,
      })
    : null;
  const selectedVariantCoverImageStyle = variantPresentation?.simulatedCropStyle ?? null;
  const byteLabel = formatBytes(asset.bytes);
  const unoptimizedPreview = !isPhiMediaAssetPublic(asset.deliveryPolicy, asset.lifecycleStatus);
  return (
    <Flex
      vertical
      gap="small"
      style={{
        width: "100%",
        minWidth: 0,
        "--phi-labeled-control-label-width": "33.333333%",
      } as CSSProperties}
    >
      <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden", borderRadius: "var(--ant-border-radius-lg)", background: "var(--ant-color-fill-tertiary)" }}>
        {asset.kind === PhiMediaKind.Image ? (
          isOriginalSelection ? (
            originalCoverImageStyle ? (
              <NextImage
                alt={asset.altText ?? asset.title ?? asset.originalName}
                src={asset.deliveryUrl}
                width={asset.width ?? 1}
                height={asset.height ?? 1}
                unoptimized={unoptimizedPreview}
                sizes="340px"
                placeholder={asset.blurDataUrl ? "blur" : "empty"}
                blurDataURL={asset.blurDataUrl ?? undefined}
                style={originalCoverImageStyle}
              />
            ) : (
              <NextImage
                alt={asset.altText ?? asset.title ?? asset.originalName}
                src={asset.deliveryUrl}
                fill
                unoptimized={unoptimizedPreview}
                sizes="340px"
                placeholder={asset.blurDataUrl ? "blur" : "empty"}
                blurDataURL={asset.blurDataUrl ?? undefined}
                style={{ objectFit: "cover" }}
              />
            )
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewFrame?.fixedCropBox ? (
                <div style={{ position: "relative", width: previewFrame.fixedCropBox, height: previewFrame.fixedCropBox, flex: "0 0 auto", overflow: "hidden" }}>
                  <NextImage
                    alt={asset.altText ?? asset.title ?? asset.originalName}
                    src={variantPresentation?.url ?? asset.deliveryUrl}
                    width={previewFrame.fixedCropBox}
                    height={previewFrame.fixedCropBox}
                    unoptimized={unoptimizedPreview}
                    placeholder={asset.blurDataUrl ? "blur" : "empty"}
                    blurDataURL={asset.blurDataUrl ?? undefined}
                    style={selectedVariantCoverImageStyle ?? undefined}
                  />
                </div>
              ) : (
                <div
                  style={{
                    position: "relative",
                    width: previewFrame?.fitAxis === "width" ? "100%" : "auto",
                    height: previewFrame?.fitAxis === "height" ? "100%" : "auto",
                    flex: "0 0 auto",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    overflow: "hidden",
                    aspectRatio: previewFrame?.width && previewFrame.height
                      ? `${previewFrame.width} / ${previewFrame.height}`
                      : undefined,
                  }}
                >
                  {selectedVariantCoverImageStyle ? (
                    <NextImage
                      alt={asset.altText ?? asset.title ?? asset.originalName}
                      src={variantPresentation?.url ?? asset.deliveryUrl}
                      width={asset.width ?? 1}
                      height={asset.height ?? 1}
                      unoptimized={unoptimizedPreview}
                      sizes={previewFrame?.width ? `${previewFrame.width}px` : "340px"}
                      placeholder={asset.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={asset.blurDataUrl ?? undefined}
                      style={selectedVariantCoverImageStyle}
                    />
                  ) : (
                    <NextImage
                      alt={asset.altText ?? asset.title ?? asset.originalName}
                      src={variantPresentation?.url ?? asset.deliveryUrl}
                      fill
                      unoptimized={unoptimizedPreview}
                      sizes={previewFrame?.width ? `${previewFrame.width}px` : "340px"}
                      placeholder={asset.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={asset.blurDataUrl ?? undefined}
                      style={{ objectFit: variantPresentation?.fit ?? previewFrame?.fit ?? "contain" }}
                    />
                  )}
                </div>
              )}
            </div>
          )
        ) : (
          <Flex align="center" justify="center" style={{ width: "100%", height: "100%" }}><PhiMediaKindIcon kind={asset.kind} size={40} /></Flex>
        )}
        {previewFrame?.kindLabel ? (
          <PhiTagControl style={{ position: "absolute", insetInlineStart: 10, top: 10, ...overlayTagStyle }}>
            {previewFrame.kindLabel}
          </PhiTagControl>
        ) : null}
        {byteLabel ? (
          <PhiTagControl style={{ position: "absolute", insetInlineEnd: 10, top: 10, ...overlayTagStyle }}>
            {byteLabel}
          </PhiTagControl>
        ) : null}
        {previewFrame?.label ? (
          <PhiTagControl style={{ position: "absolute", insetInlineStart: 10, bottom: 10, ...overlayTagStyle }}>
            {previewFrame.label}
          </PhiTagControl>
        ) : null}
        {asset.kind === PhiMediaKind.Image && onFocalRectOpen ? (
          <div style={{ position: "absolute", insetInlineEnd: 10, bottom: 10, zIndex: 3 }}>
            <PhiButtonControl
              size="small"
              label={labels.editor.focalRectButtonLabel}
              type="primary"
              onClick={onFocalRectOpen}
            />
          </div>
        ) : null}
      </div>
      <Typography.Text strong ellipsis>{asset.originalName}</Typography.Text>
      {asset.kind === PhiMediaKind.Image && onVariantKeyChange ? (
        <PhiSelectControl
          label={labels.inspector.variantsLabel}
          value={selectedVariantKey == null ? "original" : String(selectedVariantKey)}
          options={[
            { value: "original", label: labels.inspector.originalVariantLabel },
            ...Object.entries(PhiImageAssetVariantKeyName).map(([value, variantName]) => ({
              value,
              label: labels.inspector[`${variantName.toLowerCase()}VariantLabel` as keyof typeof labels.inspector],
            })),
          ]}
          onChange={(value) => onVariantKeyChange(value === "original" ? null : Number(value) as PhiImageAssetVariantKeyValue)}
          style={{ width: "100%" }}
        />
      ) : null}
    </Flex>
  );
}
