"use client";

import { useCallback, useState, type ReactNode } from "react";
import { StarOutlined } from "@ant-design/icons";

import { PhiMediaAssetFlags, PhiMediaKind } from "../../../../constants/media";
import { normalizePhiImagePreviewTile } from "../../../media/phi-image-preview-data";
import { bumpPhiImagePreviewRefreshToken } from "../../../media/phi-image-preview-store";
import { usePhiMediaPickerBinding } from "../../../media/phi-media-picker-binding";
import { runPhiMediaUploadSession } from "../../../media/media-upload-flow";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  readPhiMediaUploadErrorMessage,
} from "../../../media/phi-media-upload";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS } from "../../../media/media-widget-labels";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../label-types/search";
import {
  mergePhiMaskConfigDefaults,
  type PhiMaskConfig,
} from "../../config/mask";
import { PhiMaskPickerControl } from "../../../controls/phi-mask-picker-control";
import type { PhiPickerPlacement } from "../../../controls/phi-picker-control-contract";
import { usePhiApplicationFeedback } from "../../../runtime/use-phi-application-feedback";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";
import { createPhiMediaPickerAssetControllerRoutes } from "../../../media/asset-controller-routes";

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

function mergeMask(value: PhiMaskConfig | null | undefined, patch: PhiMaskConfig): PhiMaskConfig {
  return {
    ...mergePhiMaskConfigDefaults(value),
    ...patch,
    enabled: patch.enabled ?? true,
  };
}

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
  buttonIcon = <StarOutlined />,
  placement = "bottomRight",
}: PhiMaskPickerButtonProps) {
  const { showMessage } = usePhiApplicationFeedback();
  const popup = usePhiWidgetScaffoldPopup();
  const [open, setOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);

  const updateOpen = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setMediaOpen(false);
    popup.setOpen(nextOpen);
  }, [popup]);

  const applyAsset = useCallback((asset: { id: number; deliveryUrl: string }) => {
    onChange(mergeMask(value, {
      source: "asset",
      assetId: asset.id,
      assetUrl: asset.deliveryUrl,
    }));
    updateOpen(false);
  }, [onChange, updateOpen, value]);

  const clearAsset = useCallback(() => {
    onChange(mergeMask(value, {
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
    setUploading(true);
    setUploadProgress(0);
    void runPhiMediaUploadSession(
      file,
      setUploadProgress,
      { presentationFlags: PhiMediaAssetFlags.Mask },
    ).then((result) => {
      applyUploadedAsset(result.asset);
      showMessage({ level: "success", content: `Uploaded ${file.name}.` });
    }).catch((error: unknown) => {
      // One reading of every refusal, rather than whatever string the control plane happened to send.
      showMessage({
        level: "error",
        content: readPhiMediaUploadErrorMessage(error, PHI_MEDIA_UPLOAD_DEFAULT_LABELS),
      });
    }).finally(() => {
      setUploading(false);
      setUploadProgress(0);
    });
  }, [applyUploadedAsset, showMessage]);

  const uploadIconifyMask = useCallback((nextIconValue: string | null) => {
    setSelectedIcon(nextIconValue);
    const icon = parseIconifyIcon(nextIconValue);
    if (!icon) {
      if (nextIconValue) showMessage({ level: "error", content: "Select an Iconify icon for mask uploads." });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    void fetch(buildIconifySvgUrl(icon), { cache: "force-cache" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Iconify SVG request failed with ${response.status}.`);
        const svg = await response.text();
        const file = new File([svg], `${buildIconifyMaskFilename(icon)}.svg`, { type: "image/svg+xml" });
        return runPhiMediaUploadSession(file, setUploadProgress, {
          presentationFlags: PhiMediaAssetFlags.Mask,
          meta: {
            source: "iconify",
            iconify: {
              iconSet: icon.iconSet,
              iconName: icon.iconName,
              iconKey: icon.iconKey,
            },
            usage: { mask: true },
          },
        });
      })
      .then((result) => {
        applyUploadedAsset(result.asset);
        showMessage({ level: "success", content: `Selected ${icon.iconKey}.` });
      })
      .catch((error: unknown) => {
        showMessage({
          level: "error",
          content: readPhiMediaUploadErrorMessage(error, PHI_MEDIA_UPLOAD_DEFAULT_LABELS),
        });
      })
      .finally(() => {
        setUploading(false);
        setUploadProgress(0);
      });
  }, [applyUploadedAsset, showMessage]);

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
