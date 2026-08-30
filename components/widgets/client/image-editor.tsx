"use client";

import { useEffect, useRef } from "react";

import { Typography } from "antd";

import {
  normalizePhiImageAssetVariantKey,
  resolvePhiImageAssetVariantSpec,
} from "../../../constants/media";
import type { PhiMediaAsset } from "../../../types/media";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiCmsImageWidgetConfig } from "../../../plugins/runtime-modules/core/widgets/image/config";
import { PHI_IMAGE_WIDGET_DEFAULT_LABELS } from "../label-types/image";
import { PhiMaskPickerButton } from "./shared/phi-mask-picker";
import { PhiWidgetImageToolButton } from "./shared/phi-widget-image-tool-button";
import { PhiImageWidget } from "../../../plugins/runtime-modules/core/widgets/image/client";
import { usePhiAuthoringAssetDetails } from "../../media/use-authoring-asset-details";

export type PhiImageWidgetEditorProps = {
  config?: PhiCmsImageWidgetConfig | null;
  onChange?: (patch: Partial<PhiCmsImageWidgetConfig>) => void;
};

function formatImageEditorOverlaySize(
  config: PhiCmsImageWidgetConfig | null | undefined,
  asset: PhiMediaAsset | null,
  width: PhiCmsImageWidgetConfig["width"] | null | undefined,
  height: PhiCmsImageWidgetConfig["height"] | null | undefined,
) {
  const variantKey = normalizePhiImageAssetVariantKey(config?.variantKey);
  const variantSpec = config?.sourceKind === "asset"
    ? resolvePhiImageAssetVariantSpec(variantKey)
    : null;
  const resolvedWidth = config?.overrideSize === true
    ? width
    : variantSpec?.width ?? asset?.width ?? width;
  const resolvedHeight = config?.overrideSize === true
    ? height
    : variantSpec?.height ?? asset?.height ?? height;

  if (resolvedWidth == null || resolvedHeight == null) {
    return null;
  }

  return `${resolvedWidth}x${resolvedHeight}`;
}

export function PhiImageWidgetEditor({ config, onChange }: PhiImageWidgetEditorProps) {
  const assetId = config?.sourceKind === "asset" ? config.assetId : null;
  const variantKey = normalizePhiImageAssetVariantKey(config?.variantKey);
  const previousVariantKeyRef = useRef<PhiCmsImageWidgetConfig["variantKey"] | null>(null);
  const resolvedAssetDetails = usePhiAuthoringAssetDetails(assetId);

  useEffect(() => {
    if (assetId == null || !resolvedAssetDetails) {
      previousVariantKeyRef.current = variantKey;
      return;
    }

    const previousVariantKey = previousVariantKeyRef.current;
    previousVariantKeyRef.current = variantKey;
    const variant = variantKey == null
      ? null
      : resolvedAssetDetails.variants?.find((item) => item.variantKey === variantKey) ?? null;

    if (variantKey != null) {
      const nextConfig: Partial<PhiCmsImageWidgetConfig> = {
        blurDataUrl: variant?.blurDataUrl ?? resolvedAssetDetails.blurDataUrl ?? undefined,
        variantVersion: resolvedAssetDetails.variantVersion ?? null,
      };
      if (
        (config?.blurDataUrl ?? undefined) === nextConfig.blurDataUrl &&
        (config?.variantVersion ?? null) === nextConfig.variantVersion
      ) {
        return;
      }

      onChange?.(nextConfig);
      return;
    }

    const selectedOriginal =
      previousVariantKey != null && variantKey == null;
    if (selectedOriginal) {
      const nextConfig: Partial<PhiCmsImageWidgetConfig> = {
        blurDataUrl: resolvedAssetDetails.blurDataUrl ?? undefined,
        variantVersion: resolvedAssetDetails.variantVersion ?? null,
      };
      if (
        (config?.blurDataUrl ?? undefined) === nextConfig.blurDataUrl &&
        (config?.variantVersion ?? null) === nextConfig.variantVersion
      ) {
        return;
      }

      onChange?.(nextConfig);
      return;
    }
  }, [
    assetId,
    config?.blurDataUrl,
    config?.variantVersion,
    resolvedAssetDetails,
    variantKey,
    onChange,
  ]);

  const overlaySize = formatImageEditorOverlaySize(
    config,
    resolvedAssetDetails,
    config?.width ?? resolvedAssetDetails?.width,
    config?.height ?? resolvedAssetDetails?.height,
  );

  return (
    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
      <PhiImageWidget
        labels={PHI_IMAGE_WIDGET_DEFAULT_LABELS}
        config={config ?? undefined}
        resolvedAsset={resolvedAssetDetails}
        focalRect={resolvedAssetDetails?.meta?.focalRect ?? null}
      />
      {assetId != null ? (
        <Typography.Text
          style={{
            position: "absolute",
            top: "0.375rem",
            right: "0.375rem",
            color: "#fff",
            fontSize: 14,
            lineHeight: 1,
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.85)",
            pointerEvents: "none",
          }}
        >
          #{assetId}
        </Typography.Text>
      ) : null}
      {overlaySize ? (
        <Typography.Text
          style={{
            position: "absolute",
            left: "0.375rem",
            bottom: "0.375rem",
            color: "#fff",
            fontSize: 14,
            lineHeight: 1,
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.85)",
            pointerEvents: "none",
          }}
        >
          {overlaySize}
        </Typography.Text>
      ) : null}
    </div>
  );
}

export function PhiImageWidgetEditorTools({
  blockId,
  config,
  onChange,
}: PhiImageWidgetEditorProps & { blockId: PhiCmsInstanceId }) {
  return (
    <span
      style={{ display: "inline-flex" }}
    >
      <PhiWidgetImageToolButton blockId={blockId} onChange={(patch) => onChange?.(patch)} />
      <PhiMaskPickerButton
        value={config?.mask}
        onChange={(mask) => {
          onChange?.({ mask });
        }}
      />
    </span>
  );
}
