"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { PhiMediaAssetFlags, PhiMediaAssetSource, PhiMediaKind } from "../../../../constants/media";
import { normalizePhiImagePreviewTile } from "../../../media/phi-image-preview-data";
import { bumpPhiImagePreviewRefreshToken } from "../../../media/phi-image-preview-store";
import { usePhiMediaPickerBinding } from "../../../media/phi-media-picker-binding";
import { isPhiMediaUploadCancelled, runPhiMediaUploadSession } from "../../../media/media-upload-flow";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  readPhiMediaUploadErrorMessage,
} from "../../../media/phi-media-upload";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../media/media-widget-labels";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../label-types/search";
import {
  mergePhiMaskConfigPatch,
  type PhiMaskConfig,
} from "../../config/mask";
import { PhiMaskPickerControl } from "../../../controls/phi-mask-picker-control";
import type { PhiPickerPlacement } from "../../../controls/phi-picker-control-contract";
import { usePhiApplicationFeedback } from "../../../runtime/use-phi-application-feedback";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";
import { createPhiMediaPickerAssetControllerRoutes } from "../../../media/asset-controller-routes";
import { PhiIcon } from "../../../shell/phi-icon";

type ParsedIconifyIcon = {
  iconSet: string;
  iconName: string;
  iconKey: string;
};

const PHI_MASK_PICKER_MEDIA_ROUTES = createPhiMediaPickerAssetControllerRoutes(
  "mask-picker-media",
  "area",
);
const PHI_MASK_MEDIA_SCOPE_KEY = "image-mask-picker";

export type PhiMaskPickerButtonProps = {
  value?: PhiMaskConfig | null;
  onChange: (nextValue: PhiMaskConfig | undefined) => void;
  onCommit?: (value: PhiMaskConfig | undefined, originalValue: PhiMaskConfig | undefined) => void;
  onDiscard?: (originalValue: PhiMaskConfig | undefined) => void;
  buttonAriaLabel?: string;
  buttonIcon?: ReactNode;
  placement?: PhiPickerPlacement;
};

function parseIconifyIcon(value: string | null | undefined): ParsedIconifyIcon | null {
  if (!value?.startsWith("iconify:")) return null;
  const [, iconSet, ...nameParts] = value.split(":");
  const iconName = nameParts.join(":").trim();
  const resolvedIconSet = iconSet?.trim();
  if (!resolvedIconSet || !iconName) return null;
  return {
    iconSet: resolvedIconSet,
    iconName,
    iconKey: `${resolvedIconSet}:${iconName}`,
  };
}

function buildIconifySvgUrl(icon: ParsedIconifyIcon) {
  return `https://api.iconify.design/${encodeURIComponent(icon.iconSet)}/${encodeURIComponent(icon.iconName)}.svg`;
}

function buildIconifyMaskFilename(icon: ParsedIconifyIcon) {
  return `${icon.iconSet}-${icon.iconName}`.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "icon-mask";
}

export function PhiMaskPickerButton({
  value,
  onChange,
  onCommit,
  onDiscard,
  buttonAriaLabel = "Select mask",
  buttonIcon = <PhiIcon name="star" size="inherit" />,
  placement = "bottomRight",
}: PhiMaskPickerButtonProps) {
  const { showMessage } = usePhiApplicationFeedback();
  const popup = usePhiWidgetScaffoldPopup();
  const [open, setOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  /*
   * The value as it stands when an upload lands, not as it stood when the upload began: scale, offset
   * and rotation can be changed while the file travels, and the Asset is merged into what is there.
   */
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  /*
   * One upload at a time. A second file or icon while one travels is not taken -- the controls are
   * disabled, and this holds for a drop that arrives before they re-render -- so two Assets can never
   * race for the mask. Leaving the picker stops the upload; the Server clears up what arrived.
   */
  const uploadRef = useRef<AbortController | null>(null);
  useEffect(() => () => uploadRef.current?.abort(), []);
  const beginUpload = useCallback(() => {
    if (uploadRef.current) return null;
    const controller = new AbortController();
    uploadRef.current = controller;
    setUploading(true);
    setUploadProgress(0);
    return controller;
  }, []);
  const endUpload = useCallback((controller: AbortController) => {
    if (uploadRef.current !== controller) return;
    uploadRef.current = null;
    setUploading(false);
    setUploadProgress(0);
  }, []);

  const updateOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setMediaOpen(false);
    popup.setOpen(nextOpen);
  }, [popup]);

  const applyAsset = useCallback((asset: { id: number; deliveryUrl: string }) => {
    onChange(mergePhiMaskConfigPatch(valueRef.current, {
      source: "asset",
      assetId: asset.id,
      assetUrl: asset.deliveryUrl,
    }));
    updateOpen(false);
  }, [onChange, updateOpen]);

  const clearAsset = useCallback(() => {
    onChange(mergePhiMaskConfigPatch(value, {
      source: "preset",
      preset: "circle",
      assetId: undefined,
      assetUrl: undefined,
    }));
  }, [onChange, value]);

  const mediaPickerProps = usePhiMediaPickerBinding({
    labels: PHI_MEDIA_WIDGET_DEFAULT_LABELS,
    searchLabels: PHI_SEARCH_WIDGET_DEFAULT_LABELS,
    config: {
      mediaType: PhiMediaKind.Image,
      presentationFlags: PhiMediaAssetFlags.Mask,
      pageSize: 12,
      showPagination: true,
      showGroupFilter: true,
      showSearchBar: true,
      signalRoutes: PHI_MASK_PICKER_MEDIA_ROUTES,
    },
    open: mediaOpen,
    onOpenChange: setMediaOpen,
    onAssetSelect: applyAsset,
    onAssetClear: clearAsset,
  });

  const applyUploadedAsset = useCallback((asset: Parameters<typeof normalizePhiImagePreviewTile>[0]) => {
    const tile = normalizePhiImagePreviewTile(asset, []);
    bumpPhiImagePreviewRefreshToken(PHI_MASK_MEDIA_SCOPE_KEY);
    applyAsset(tile);
  }, [applyAsset]);

  const uploadFile = useCallback((file: File) => {
    const controller = beginUpload();
    if (!controller) return;
    void runPhiMediaUploadSession(
      file,
      setUploadProgress,
      { presentationFlags: PhiMediaAssetFlags.Mask },
      controller.signal,
    ).then((result) => {
      if (controller.signal.aborted) return;
      applyUploadedAsset(result.asset);
      showMessage({ level: "success", content: `Uploaded ${file.name}.` });
    }).catch((error: unknown) => {
      if (controller.signal.aborted || isPhiMediaUploadCancelled(error)) return;
      // One reading of every refusal, rather than whatever string the control plane happened to send.
      showMessage({
        level: "error",
        content: readPhiMediaUploadErrorMessage(error, PHI_MEDIA_UPLOAD_DEFAULT_LABELS),
      });
    }).finally(() => endUpload(controller));
  }, [applyUploadedAsset, beginUpload, endUpload, showMessage]);

  const uploadIconifyMask = useCallback((nextIconValue: string | null) => {
    setSelectedIcon(nextIconValue);
    const icon = parseIconifyIcon(nextIconValue);
    if (!icon) {
      if (nextIconValue) showMessage({ level: "error", content: "Select an Iconify icon for mask uploads." });
      return;
    }

    const controller = beginUpload();
    if (!controller) return;
    void fetch(buildIconifySvgUrl(icon), { cache: "force-cache", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Iconify SVG request failed with ${response.status}.`);
        const svg = await response.text();
        const file = new File([svg], `${buildIconifyMaskFilename(icon)}.svg`, { type: "image/svg+xml" });
        return runPhiMediaUploadSession(file, setUploadProgress, {
          presentationFlags: PhiMediaAssetFlags.Mask,
          meta: {
            source: PhiMediaAssetSource.Iconify,
            iconify: {
              iconSet: icon.iconSet,
              iconName: icon.iconName,
              iconKey: icon.iconKey,
            },
            usage: { mask: true },
          },
        }, controller.signal);
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        applyUploadedAsset(result.asset);
        showMessage({ level: "success", content: `Selected ${icon.iconKey}.` });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isPhiMediaUploadCancelled(error)) return;
        showMessage({
          level: "error",
          content: readPhiMediaUploadErrorMessage(error, PHI_MEDIA_UPLOAD_DEFAULT_LABELS),
        });
      })
      .finally(() => endUpload(controller));
  }, [applyUploadedAsset, beginUpload, endUpload, showMessage]);

  return (
    <PhiMaskPickerControl
      value={value}
      open={open}
      placement={placement}
      buttonAriaLabel={buttonAriaLabel}
      buttonIcon={buttonIcon}
      mediaPickerProps={mediaPickerProps}
      selectedIcon={selectedIcon}
      uploading={uploading}
      uploadProgress={uploadProgress}
      popupRootClassName={popup.rootClassName}
      getPopupContainer={popup.getPopupContainer}
      onUploadFile={uploadFile}
      onIconSelect={uploadIconifyMask}
      onChange={onChange}
      onCommit={onCommit}
      onDiscard={onDiscard}
      onOpenChange={updateOpen}
    />
  );
}
