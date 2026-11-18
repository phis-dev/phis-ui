"use client";


import {
  PhiImageAssetVariantKey,
  PhiMediaKind,
} from "../../../../constants/media";
import type {
  PhiImageAssetVariantKeyValue,
  PhiMediaAssetTile,
} from "../../../../types/media";
import { PhiMediaPickerBinding } from "../../../media/phi-media-picker-binding";
import { usePhiMediaPickerLabels } from "../../../media/phi-media-picker-labels";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../label-types/search";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";
import { usePhiAuthoringToolsLabels } from "./phi-authoring-tools-labels";
import { PhiButtonControl } from "../../../controls/phi-button-control";
import { PhiIcon } from "../../../shell/phi-icon";

type PhiWidgetImageToolButtonCommonPatch = {
  trusted?: boolean;
  /** Cleared when the image changes: a fixed size chosen for one image is no answer for the next. */
  imageSize?: undefined;
};

export type PhiWidgetImageToolButtonPatch = PhiWidgetImageToolButtonCommonPatch & (
  | {
      sourceKind: "asset";
      assetId: number;
      variantKey?: PhiImageAssetVariantKeyValue | null;
      variantVersion?: number | null;
    }
  | {
      sourceKind: "url";
      sourceUrl?: string;
    }
);

/**
 * A picker opened from authoring chrome keeps its own search, folder and page, and sends the Asset
 * Controller nothing: that Controller belongs to the Media Page, and what a tool button searched for
 * is no business of the gallery there.
 */
export function PhiInternalAssetReferencePickerButton({
  ariaLabel,
  onSelect,
  onClear,
}: {
  ariaLabel?: string;
  onSelect: (asset: PhiMediaAssetTile) => void;
  onClear?: () => void;
}) {
  const labels = usePhiAuthoringToolsLabels();
  const mediaLabels = usePhiMediaPickerLabels();
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiMediaPickerBinding
      labels={mediaLabels}
      searchLabels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
      config={{
        mediaType: PhiMediaKind.Image,
        pageSize: 12,
        showPagination: true,
        showGroupFilter: true,
        showSearchBar: true,
      }}
      getPopupContainer={popup.getPopupContainer}
      popupRootClassName={popup.rootClassName}
      onPopupOpenChange={popup.setOpen}
      trigger={
        <span style={{ display: "inline-flex" }}>
          <PhiButtonControl
            type="text"
            size="small"
            icon={<PhiIcon name="picture" size="inherit" />}
            ariaLabel={ariaLabel ?? labels.fallbacks.selectImage}
            style={{ width: 24, minWidth: 24, height: 24, padding: 0 }}
            onClick={() => undefined}
          />
        </span>
      }
      onAssetSelect={onSelect}
      onAssetClear={onClear}
    />
  );
}

export function PhiWidgetImageToolButton({
  onChange,
}: {
  onChange: (patch: PhiWidgetImageToolButtonPatch) => void;
}) {
  const selectAsset = (asset: PhiMediaAssetTile) => {
    onChange({
      sourceKind: "asset",
      assetId: asset.id,
      variantKey: PhiImageAssetVariantKey.Card,
      variantVersion: asset.variantVersion ?? null,
      trusted: false,
      imageSize: undefined,
    });
  };

  return (
    <PhiInternalAssetReferencePickerButton
      onSelect={selectAsset}
      onClear={() => {
        onChange({
          sourceKind: "url",
          sourceUrl: undefined,
          imageSize: undefined,
        });
      }}
    />
  );
}
