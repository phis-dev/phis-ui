"use client";

import type { ReactNode } from "react";

import { PhiMediaKind } from "../../constants/media";
import type { PhiMediaAssetTile } from "../../types/media";
import type { PhiCmsMediaPickerWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/media-picker/config";
import type { PhiSearchWidgetLabels } from "../widgets/label-types/search";
import { usePhiWidgetScaffoldPopup } from "../widgets/client/shared/phi-widget-scaffold-popup";
import type { PhiAssetWidgetLabels } from "./media-widget-labels";
import { PhiMediaPickerBinding } from "./phi-media-picker-binding";

export type PhiMediaPickerWidgetProps = {
  config?: PhiCmsMediaPickerWidgetConfig | null;
  labels: PhiAssetWidgetLabels;
  searchLabels: PhiSearchWidgetLabels;
  value?: number | null;
  onAssetSelect?: (asset: PhiMediaAssetTile) => void;
  onAssetClear?: () => void;
  compact?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCommit?: (assetId: number | null, originalAssetId: number | null) => void;
  onDiscard?: (originalAssetId: number | null) => void;
  trigger?: ReactNode;
};

export function PhiMediaPickerWidget({ config, labels, searchLabels, value, onAssetSelect, onAssetClear, open: controlledOpen, onOpenChange, onCommit, onDiscard, trigger }: PhiMediaPickerWidgetProps) {
  const popup = usePhiWidgetScaffoldPopup();
  return <PhiMediaPickerBinding
    config={{ ...config, mediaType: config?.mediaType ?? PhiMediaKind.Image }}
    labels={labels}
    searchLabels={searchLabels}
    value={value}
    open={controlledOpen}
    trigger={trigger}
    getPopupContainer={popup.getPopupContainer}
    popupRootClassName={popup.rootClassName}
    onPopupOpenChange={popup.setOpen}
    onOpenChange={onOpenChange}
    onCommit={onCommit}
    onDiscard={onDiscard}
    onAssetSelect={onAssetSelect}
    onAssetClear={onAssetClear}
  />;
}
