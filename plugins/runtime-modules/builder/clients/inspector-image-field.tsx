"use client";

import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import { PhiSelectControl } from "../../../../components/controls/phi-select-control";
import { PhiTextControl } from "../../../../components/controls/phi-text-control";
import { PhiMediaPickerBinding } from "../../../../components/media/phi-media-picker-binding";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../../components/media/media-widget-labels";
import { createPhiMediaPickerAssetControllerRoutes } from "../../../../components/media/asset-controller-routes";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/search";
import { PHI_IMAGE_VARIANT_OPTIONS } from "../../../../components/widgets/config/image-variant-options";
import { PhiInspectorFieldRow } from "../../../../components/widgets/inspector-field-row";
import { usePhiAuthoringAssetDetails } from "../../../../components/media/use-authoring-asset-details";
import { PhiImageAssetVariantKey, PhiMediaKind } from "../../../../constants/media";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";

const PHI_IMAGE_FIELD_ORIGINAL_VARIANT = "__original__";

/**
 * A Widget's picture, chosen and described in one place: which picture, in which rendition, and what it
 * says to a reader who cannot see it. The picture is chosen with the house's media picker, the one the
 * Background control uses; this adds only what a picture placed on its own also needs.
 *
 * It writes the keys every image source is read from (`readPhiMediaImageSourceConfig`) -- `sourceKind`,
 * `assetId`, `variantKey`, `variantVersion`, `sourceUrl` -- and `alt`. An Asset is picked from the media
 * library; without one, an address stands for a picture from elsewhere. Removing the picture clears both,
 * so nothing of the old one is left to come back.
 */
export function PhiInspectorImageFieldControl({
  config,
  blockId,
  disabled,
  onChange,
}: {
  config: Record<string, unknown>;
  blockId?: PhiCmsInstanceId | null;
  disabled?: boolean;
  onChange?: (patch: Record<string, unknown>) => void;
}) {
  const assetId = config.sourceKind === "asset" && typeof config.assetId === "number" ? config.assetId : null;
  const asset = usePhiAuthoringAssetDetails(assetId);
  const sourceUrl = typeof config.sourceUrl === "string" ? config.sourceUrl : "";
  const variantKey = typeof config.variantKey === "number" ? String(config.variantKey) : PHI_IMAGE_FIELD_ORIGINAL_VARIANT;
  const editable = !disabled && onChange != null;

  return (
    <PhiFlexControl vertical gap={8} style={{ width: "100%", minWidth: 0 }}>
      <PhiMediaPickerBinding
        config={{
          mediaType: PhiMediaKind.Image,
          pageSize: 12,
          showPagination: true,
          showGroupFilter: true,
          showSearchBar: true,
          signalRoutes: createPhiMediaPickerAssetControllerRoutes(`inspector-image-${blockId ?? "field"}`, "area"),
        }}
        labels={PHI_MEDIA_WIDGET_DEFAULT_LABELS}
        searchLabels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
        value={assetId}
        onAssetSelect={editable
          ? (picked) => onChange?.({
              sourceKind: "asset",
              assetId: picked.id,
              variantKey: PhiImageAssetVariantKey.Card,
              variantVersion: picked.variantVersion ?? null,
              sourceUrl: undefined,
            })
          : undefined}
        onAssetClear={editable
          ? () => onChange?.({
              sourceKind: "url",
              assetId: undefined,
              variantKey: undefined,
              variantVersion: undefined,
              sourceUrl: undefined,
            })
          : undefined}
      />
      {assetId != null ? (
        <PhiInspectorFieldRow label="Variant">
          <PhiSelectControl
            value={variantKey}
            options={[{ value: PHI_IMAGE_FIELD_ORIGINAL_VARIANT, label: "Original", separator: "after" }, ...PHI_IMAGE_VARIANT_OPTIONS]}
            disabled={!editable}
            style={{ width: "100%" }}
            onChange={(next) => onChange?.({
              variantKey: next === PHI_IMAGE_FIELD_ORIGINAL_VARIANT ? null : Number(next),
            })}
          />
        </PhiInspectorFieldRow>
      ) : (
        <PhiInspectorFieldRow label="URL">
          <PhiTextControl
            value={sourceUrl}
            inputType="url"
            placeholder="https://"
            disabled={!editable}
            style={{ width: "100%" }}
            onChange={(next) => onChange?.({ sourceKind: "url", sourceUrl: next?.trim() || undefined })}
          />
        </PhiInspectorFieldRow>
      )}
      <PhiInspectorFieldRow label="Alt text">
        <PhiTextControl
          value={typeof config.alt === "string" ? config.alt : ""}
          /* An Asset brings its own; this replaces it for this placement only. */
          placeholder={asset?.altText ?? undefined}
          disabled={!editable}
          style={{ width: "100%" }}
          onChange={(next) => onChange?.({ alt: next || undefined })}
        />
      </PhiInspectorFieldRow>
    </PhiFlexControl>
  );
}
