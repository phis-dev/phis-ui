"use client";

import { PictureOutlined } from "@ant-design/icons";

import {
  PhiImageAssetVariantKey,
  PhiMediaKind,
} from "../../../../constants/media";
import type {
  PhiImageAssetVariantKeyValue,
  PhiMediaAssetTile,
} from "../../../../types/media";
import type { PhiCmsInstanceId } from "../../../../types/cms-instance-id";
import type { PhiCssLength } from "../../../../types/length";
import { PhiMediaPickerBinding } from "../../../media/phi-media-picker-binding";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../media/media-widget-labels";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../label-types/search";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";
import { PhiButtonControl } from "../../../controls/phi-button-control";
import { createPhiMediaPickerAssetControllerRoutes } from "../../../media/asset-controller-routes";

type PhiWidgetImageToolButtonCommonPatch = {
  trusted?: boolean;
  overrideSize?: boolean;
  width?: PhiCssLength;
  height?: PhiCssLength;
  blurDataUrl?: string;
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

export function PhiInternalAssetReferencePickerButton({
  blockId,
  ariaLabel = "Select image",
  onSelect,
  onClear,
}: {
  blockId: PhiCmsInstanceId;
  ariaLabel?: string;
  onSelect: (asset: PhiMediaAssetTile) => void;
  onClear?: () => void;
}) {
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiMediaPickerBinding
      labels={PHI_MEDIA_WIDGET_DEFAULT_LABELS}
      searchLabels={PHI_SEARCH_WIDGET_DEFAULT_LABELS}
      config={{
        mediaType: PhiMediaKind.Image,
        pageSize: 12,
        showPagination: true,
        showGroupFilter: true,
        showSearchBar: true,
        signalRoutes: createPhiMediaPickerAssetControllerRoutes(
          `internal-asset-reference-${blockId}`,
          "area",
        ),
      }}
      getPopupContainer={popup.getPopupContainer}
      popupRootClassName={popup.rootClassName}
      onPopupOpenChange={popup.setOpen}
      trigger={
        <span style={{ display: "inline-flex" }}>
          <PhiButtonControl
            type="text"
            size="small"
            icon={<PictureOutlined />}
            ariaLabel={ariaLabel}
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
  blockId,
  onChange,
}: {
  blockId: PhiCmsInstanceId;
  onChange: (patch: PhiWidgetImageToolButtonPatch) => void;
}) {
  const selectAsset = (asset: PhiMediaAssetTile) => {
    onChange({
      sourceKind: "asset",
      assetId: asset.id,
      variantKey: PhiImageAssetVariantKey.Card,
      variantVersion: asset.variantVersion ?? null,
      trusted: false,
      overrideSize: false,
      width: undefined,
      height: undefined,
      blurDataUrl: asset.blurDataUrl ?? undefined,
    });
  };

  return (
    <PhiInternalAssetReferencePickerButton
      blockId={blockId}
      onSelect={selectAsset}
      onClear={() => {
        onChange({
          sourceKind: "url",
          sourceUrl: undefined,
          overrideSize: false,
          width: undefined,
          height: undefined,
          blurDataUrl: undefined,
        });
      }}
    />
  );
}
