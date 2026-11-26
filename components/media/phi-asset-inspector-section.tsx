"use client";


import { resolvePhiMediaAssetTypeLabel } from "./asset-type-label";
import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  PhiImageAssetVariantKeyName,
  PhiMediaKind,
  isPhiMediaAssetOriginalOptimizable,
  resolvePhiImageAssetVariantSpec,
} from "../../constants/media";
import type { PhiImageAssetVariantKeyValue, PhiMediaAsset } from "../../types/media";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiFormControl, type PhiFormControlFormInstance } from "../controls/phi-form-control";
import { PhiTagControl } from "../controls/phi-tag-control";
import { createPhiFormLiteralText } from "../forms/form-descriptor-contract";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "../forms/form-provider-contract";
import { PHI_FORM_DESCRIPTOR_SCHEMA_VERSION, type PhiFormDescriptor } from "../../types/form-descriptor";
import { PHI_ASSET_INSPECTOR_FORM_LAYOUT } from "./asset-inspector-form-layout";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiMediaKindIcon } from "./phi-media-kind-icon";
import { resolvePhiMediaAssetDisplayDimensions } from "./phi-image-preview-data";
import type { PhiAssetModuleLabels } from "./media-widget-labels";
import type { MediaFocalRect } from "./focal-rect";
import { resolveFocalRectCoverImageStyle } from "./focal-rect";
import { resolvePhiImagePresentation } from "./image-presentation";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiTypographyControl } from "../controls/phi-typography-control";
import { PhiIcon } from "../shell/phi-icon";

/**
 * The Inspector label of every variant the contracts name. Typed against the contracts' names, so a variant
 * added there without a label here fails the typecheck instead of drawing an empty option.
 */
const PHI_ASSET_VARIANT_LABEL_KEYS = {
  thumbnail: "thumbnailVariantLabel",
  preview: "previewVariantLabel",
  banner: "bannerVariantLabel",
  header: "headerVariantLabel",
  card: "cardVariantLabel",
  hero: "heroVariantLabel",
  avatar: "avatarVariantLabel",
  logo: "logoVariantLabel",
  landscape: "landscapeVariantLabel",
  portrait: "portraitVariantLabel",
  icon: "iconVariantLabel",
  share: "shareVariantLabel",
} as const satisfies Record<
  (typeof PhiImageAssetVariantKeyName)[keyof typeof PhiImageAssetVariantKeyName],
  keyof PhiAssetModuleLabels["inspector"]
>;

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
      kindLabel: resolvePhiMediaAssetTypeLabel(asset.kind, asset.contentType, asset.originalName),
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
    label: width && height ? `${width} × ${height}` : resolvePhiMediaAssetTypeLabel(asset.kind, asset.contentType, asset.originalName),
    kindLabel: resolvePhiMediaAssetTypeLabel(asset.kind, asset.contentType, asset.originalName),
  };
}

/* The variant shown is applied as it is chosen, so the Form has no submit. */
function submitNothing() {}

/**
 * Which variant of the image the preview shows: a Form of one descriptor field on the Asset inspector's
 * tracks, the ones of the metadata Form below it, so its label stands in the same column as every other
 * label of the inspector. It follows the selection while it is mounted -- another Asset, or the store
 * going back to the original -- which a touched field would otherwise not.
 */
function PhiAssetVariantForm({
  labels,
  selectedVariantKey,
  onVariantKeyChange,
}: {
  labels: PhiAssetModuleLabels;
  selectedVariantKey: PhiImageAssetVariantKeyValue | null;
  onVariantKeyChange: (value: PhiImageAssetVariantKeyValue | null) => void;
}) {
  const descriptor = useMemo<PhiFormDescriptor>(() => ({
    schemaVersion: PHI_FORM_DESCRIPTOR_SCHEMA_VERSION,
    key: "asset-inspector-variant",
    layout: PHI_ASSET_INSPECTOR_FORM_LAYOUT,
    fields: [{
      key: "variant",
      fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select,
      label: createPhiFormLiteralText(labels.inspector.variantsLabel),
      options: [
        { value: "original", label: createPhiFormLiteralText(labels.inspector.originalVariantLabel) },
        ...Object.entries(PhiImageAssetVariantKeyName).map(([value, variantName]) => ({
          value,
          label: createPhiFormLiteralText(
            labels.inspector[PHI_ASSET_VARIANT_LABEL_KEYS[variantName as keyof typeof PHI_ASSET_VARIANT_LABEL_KEYS]],
          ),
        })),
      ],
    }],
  }), [labels.inspector]);
  const variant = selectedVariantKey == null ? "original" : String(selectedVariantKey);
  const formRef = useRef<PhiFormControlFormInstance | null>(null);
  const onFormReady = useCallback((form: PhiFormControlFormInstance) => {
    formRef.current = form;
  }, []);
  useEffect(() => {
    formRef.current?.setFieldsValue({ variant });
  }, [variant]);
  return (
    <PhiFormControl
      descriptor={descriptor}
      submitOnEnter={false}
      initialValues={{ variant }}
      onFormReady={onFormReady}
      onSubmit={submitNothing}
      onValuesChange={(changed) => {
        if (typeof changed.variant !== "string") return;
        onVariantKeyChange(changed.variant === "original" ? null : Number(changed.variant) as PhiImageAssetVariantKeyValue);
      }}
    />
  );
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
  labels: PhiAssetModuleLabels;
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
      <PhiFlexControl vertical gap="small" style={{ width: "100%", minWidth: 0 }}>
        {technicalValues.map(([label, value]) => (
          <PhiFlexControl key={label} vertical gap={2} style={{ minWidth: 0 }}>
            <PhiTypographyControl type="secondary">{label}</PhiTypographyControl>
            <PhiFlexControl align="center" gap="small" style={{ minWidth: 0 }}>
              <PhiTypographyControl code ellipsis style={{ flex: "1 1 auto", minWidth: 0 }}>{value}</PhiTypographyControl>
              <PhiButtonControl ariaLabel={labels.inspector.copyLabelTemplate.replace("%1", label)} type="text" size="small" icon={<PhiIcon name="copy" size="inherit" />} onClick={() => copy(value)} />
            </PhiFlexControl>
          </PhiFlexControl>
        ))}
      </PhiFlexControl>
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
  /*
   * Every picture below is the original: the variant previews draw the original with a simulated crop.
   * So the one question is whether the optimiser may touch this original, which for an SVG it may not.
   */
  const unoptimizedPreview = !isPhiMediaAssetOriginalOptimizable(asset);
  return (
    <PhiFlexControl vertical gap="small" style={{ width: "100%", minWidth: 0 }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden", borderRadius: "var(--phi-border-radius-lg)", background: "var(--phi-color-fill-tertiary)" }}>
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
          <PhiFlexControl align="center" justify="center" style={{ width: "100%", height: "100%" }}><PhiMediaKindIcon kind={asset.kind} size={40} /></PhiFlexControl>
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
      <PhiTypographyControl strong ellipsis>{asset.originalName}</PhiTypographyControl>
      {asset.kind === PhiMediaKind.Image && onVariantKeyChange ? (
        <PhiAssetVariantForm
          labels={labels}
          selectedVariantKey={selectedVariantKey}
          onVariantKeyChange={onVariantKeyChange}
        />
      ) : null}
    </PhiFlexControl>
  );
}
