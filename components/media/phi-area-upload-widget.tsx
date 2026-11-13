"use client";

import { resolvePhiMediaAssetTypeLabel } from "./asset-type-label";
import { PhiTagControl } from "../controls/phi-tag-control";
import { PhiButtonControl } from "../controls/phi-button-control";
import NextImage from "next/image";
import { useMemo, useRef, useState } from "react";

import type { PhiCmsAreaUploadWidgetConfig } from "../../types/media";
import { PhiCollectionLayoutControl } from "../controls/phi-collection-layout-control";
import {
  resolvePhiMediaKindFromContentType,
} from "../../constants/media";
import {
  normalizePhiImagePreviewTile,
  resolvePhiMediaAssetDisplayDimensions,
} from "./phi-image-preview-data";
import type { PhiMediaAssetTile } from "../../types/media";
import type { PhiCollectionProviderQuery } from "../../types/collection-provider";
import type { PhiAreaUploadWidgetLabels } from "./media-widget-labels";
import { PhiMediaKindIcon } from "./phi-media-kind-icon";
import {
  resolvePhiMediaUploadInitOptions,
  type PhiMediaUploadSessionResult,
} from "./media-upload-flow";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  usePhiMediaUpload,
  type PhiMediaUploadLabels,
} from "./phi-media-upload";
import { usePhiImagePreviewStore, type PhiImagePreviewStoreState } from "./phi-image-preview-store";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "./asset-controller-signals";
import {
  applyPhiAssetCollectionData,
  buildPhiAssetCollectionQuery,
  PHI_ASSET_COLLECTION_DATA_SOURCE,
} from "./asset-collection-runtime";
import { PhiFileDropGuard } from "./phi-file-drop-guard";
import { usePhiApplicationFeedback } from "../runtime/use-phi-application-feedback";
import { resolvePhiThemeBorderLine } from "../../helpers/border-widget-style";
import { usePhiConfig } from "../root/phi-config-provider";
import { usePhiCollectionProviderAction } from "../widgets/client/shared/phi-collection-provider";
import { PhiFileDropControl } from "../controls/phi-file-drop-control";
import { PhiProgressControl } from "../controls/phi-progress-control";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiTypographyControl } from "../controls/phi-typography-control";
import { PhiSpinControl } from "../controls/phi-spin-control";
import { PhiIcon } from "../shell/phi-icon";

type UploadWallItem = {
  localId: string;
  assetId: number;
  file: File | null;
  title: string | null;
  originalName: string;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  contentType: string;
  kind: PhiMediaAssetTile["kind"];
  width: number | null;
  height: number | null;
  presentationFlags: number;
  progress: number;
  status: "uploading" | "done" | "error";
  deleting: boolean;
  error: string | null;
};

export type PhiAreaUploadWidgetProps = {
  config?: PhiCmsAreaUploadWidgetConfig | null;
  labels: PhiAreaUploadWidgetLabels;
  onUploadComplete?: () => void;
  collectionContext?: {
    folders: PhiImagePreviewStoreState["folders"];
    folderId: number | null;
    folderPath?: string[] | null;
    presentationFlags: number | null;
    query: PhiCollectionProviderQuery;
  };
};

function buildUploadWallItem(asset: PhiMediaAssetTile, localId: string): UploadWallItem {
  return {
    localId,
    assetId: asset.id,
    file: null,
    title: asset.title,
    originalName: asset.originalName,
    thumbnailUrl: asset.thumbnailUrl ?? null,
    previewUrl: asset.previewUrl ?? null,
    contentType: asset.contentType,
    kind: asset.kind,
    width: asset.width ?? null,
    height: asset.height ?? null,
    presentationFlags: asset.presentationFlags,
    progress: 100,
    status: "done",
    deleting: false,
    error: null,
  };
}

function resolveUploadStatusLabel(item: UploadWallItem, labels: PhiAreaUploadWidgetLabels) {
  if (item.status === "error") {
    return labels.failedLabel;
  }

  if (item.status === "uploading") {
    return `${item.progress}%`;
  }

  return labels.doneLabel;
}

/**
 * The Widget's own wording over the shared reading of every refusal: its duplicate, failure and storage
 * texts, and the shared ones for the rest -- so no control plane string reaches a person.
 */
function resolveAreaUploadLabels(labels: PhiAreaUploadWidgetLabels): PhiMediaUploadLabels {
  return {
    ...PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
    errorGeneric: labels.uploadFailedText,
    errorDuplicate: labels.assetExistsLabel,
    errorStorageUnreachable: labels.uploadStorageUnreachableText,
    errorFolderLocked: labels.uploadFolderLockedText,
  };
}

/** A file still on its way, or one that failed, drawn as a tile like the Assets that arrived. */
function buildPendingWallItem(
  item: { localId: string; file: File; progress: number; status: "uploading" | "done" | "error"; error: string | null },
  presentationFlags: number,
): UploadWallItem {
  return {
    localId: item.localId,
    assetId: -1,
    file: item.file,
    title: item.file.name.replace(/\.[^.]+$/, "").trim() || item.file.name,
    originalName: item.file.name,
    thumbnailUrl: null,
    previewUrl: null,
    contentType: item.file.type,
    kind: resolvePhiMediaKindFromContentType(item.file.type),
    width: null,
    height: null,
    presentationFlags,
    progress: item.progress,
    status: item.status,
    deleting: false,
    error: item.error,
  };
}

function resolveUploadWallDisplayDimensions(item: Pick<UploadWallItem, "contentType" | "width" | "height">) {
  return resolvePhiMediaAssetDisplayDimensions(item);
}

export function PhiAreaUploadBinding({ config, labels, onUploadComplete, collectionContext }: PhiAreaUploadWidgetProps) {
  const { token } = usePhiConfig();
  const { showMessage } = usePhiApplicationFeedback();
  const uploadTileMinHeight = token.controlHeight * 4;
  const uploadTileFrameSize = token.controlHeight * 3;
  const uploadTileIconSize = token.fontSizeHeading3;
  const uploadTileLabelFontSize = token.fontSizeSM;
  const previewState = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const activateCollectionAction = usePhiCollectionProviderAction(PHI_ASSET_COLLECTION_DATA_SOURCE);
  const dragDepth = useRef(0);
  const [uploadWall, setUploadWall] = useState<UploadWallItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const allowDelete = config?.allowDelete ?? true;
  const accept = config?.accept?.trim() || "*/*";
  const multiple = config?.multiple ?? true;
  const collectionFolderId = collectionContext?.folderId ?? null;
  const collectionPresentationFlags = collectionContext?.presentationFlags ?? null;
  const hasCollectionContext = collectionContext != null;
  const uploadInitOptions = useMemo(() => resolvePhiMediaUploadInitOptions({
    collectionContext: hasCollectionContext
      ? { folderId: collectionFolderId, presentationFlags: collectionPresentationFlags }
      : null,
    previewState: {
      folderId: previewState.folderId,
      presentationFlags: previewState.presentationFlags,
    },
    configPresentationFlags: config?.presentationFlags,
    // Whatever Space the listing last answered with -- an upload follows the eye, not a separate choice.
    activeSpaceAddress: previewState.activeSpace?.address ?? null,
  }), [
    collectionFolderId,
    collectionPresentationFlags,
    config?.presentationFlags,
    hasCollectionContext,
    previewState.activeSpace?.address,
    previewState.presentationFlags,
    previewState.folderId,
  ]);

  function showUploadMessage(type: "success" | "error", content: string) {
    showMessage({
      level: type,
      content,
      durationSeconds: 2.8,
    });
  }

  async function deleteUploadedAsset(localId: string, assetId: number) {
    const nextDelete = uploadWall.find((item) => item.localId === localId && item.assetId === assetId);
    if (!nextDelete) {
      return;
    }

    setUploadWall((current) => current.map((item) => (item.localId === localId ? { ...item, deleting: true } : item)));
    try {
      const data = await activateCollectionAction({
        actionKey: "delete",
        itemKey: assetId,
        query: collectionContext?.query ?? buildPhiAssetCollectionQuery(previewState),
      });
      if (data.error) {
        throw new Error(data.error);
      }
      if (collectionContext) {
        onUploadComplete?.();
      } else {
        applyPhiAssetCollectionData(data);
      }

      setUploadWall((current) => current.filter((item) => item.localId !== localId));
      showUploadMessage("success", labels.deleteSuccessTemplate.replace("%1", nextDelete.title ?? nextDelete.originalName));
    } catch (error) {
      setUploadWall((current) => current.map((item) => (item.localId === localId ? { ...item, deleting: false } : item)));
      showUploadMessage("error", error instanceof Error ? error.message : labels.deleteFailedText);
    }
  }

  /*
   * The transport is the shared one (`usePhiMediaUpload`): progress, refusals and their wording, retry,
   * and stopping what is still on its way when the wall goes away -- a Media picker in an Overlay more
   * often than not -- so no Asset is finalized that nobody sees arrive. What is this Widget's own is the
   * wall: an Asset that arrived becomes a tile, and the listing behind it hears of it.
   */
  const areaUploadLabels = useMemo(() => resolveAreaUploadLabels(labels), [labels]);
  const upload = usePhiMediaUpload<PhiMediaUploadSessionResult["asset"]>({
    labels: areaUploadLabels,
    initOptions: uploadInitOptions,
    onUploaded: (asset, file) => {
      const uploadedTile = normalizePhiImagePreviewTile(asset, []);
      setUploadWall((current) => [buildUploadWallItem(uploadedTile, `asset-${uploadedTile.id}`), ...current]);
      onUploadComplete?.();
      showUploadMessage("success", labels.uploadSuccessTemplate.replace("%1", file.name));
    },
    onRejected: (message) => showUploadMessage("error", message),
  });
  // The shared items are on their way or failed; an arrived one is a tile in the wall instead.
  const wallItems = [
    ...upload.items
      .filter((item) => item.status !== "done")
      .map((item) => buildPendingWallItem(item, uploadInitOptions.presentationFlags ?? 0)),
    ...uploadWall,
  ];

  return (
    <PhiFlexControl vertical gap={12} style={{ width: "100%" }}>
      <PhiFileDropGuard />
      <div
        data-phi-media-dropzone="true"
        onDragEnter={() => {
          dragDepth.current += 1;
          setIsDragActive(true);
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) {
            setIsDragActive(false);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setIsDragActive(true);
        }}
        onDrop={() => {
          dragDepth.current = 0;
          setIsDragActive(false);
        }}
        style={{ width: "100%" }}
      >
        <PhiFileDropControl
          dropZone
          multiple={multiple}
          accept={accept}
          onFile={(file) => void upload.upload(file)}
          style={{
            padding: 0,
            width: "100%",
            borderColor: isDragActive ? token.colorPrimary : undefined,
            background: isDragActive ? token.colorFillQuaternary : undefined,
          }}
        >
          <PhiFlexControl
            vertical
            align="center"
            gap={4}
            style={{
              width: "100%",
              minHeight: uploadTileMinHeight,
              justifyContent: "center",
              cursor: isDragActive ? "copy" : "default",
            }}
          >
            <PhiIcon name="upload" size="inherit" style={{ fontSize: uploadTileIconSize, color: token.colorTextSecondary }} />
            <PhiTypographyControl strong>{labels.dropTitle}</PhiTypographyControl>
            <PhiTypographyControl type="secondary">{labels.dropHint}</PhiTypographyControl>
          </PhiFlexControl>
        </PhiFileDropControl>
      </div>

      <PhiCollectionLayoutControl
        mode="grid"
        gap={token.paddingSM}
        minColumnWidth={uploadTileFrameSize}
        items={wallItems.map((item) => {
          const displayDimensions = resolveUploadWallDisplayDimensions(item);

          return (
            <div
              key={item.localId}
              style={{
                border: resolvePhiThemeBorderLine(token.colorBorderSecondary),
                /*
                 * The same corner the finished tile beside it takes: the Site's surface step, not the
                 * widest corner the numeric scale happens to have (THEME.md, "Control shape").
                 * `borderRadiusLG` here meant an upload stood square in a `pill` Site and then changed
                 * shape the moment it turned into an asset tile. No antd fallback beside it -- the
                 * Provider `usePhiConfig` reads is what writes this property.
                 */
                borderRadius: "var(--phi-surface-radius)",
                overflow: "hidden",
                background: item.status === "uploading" ? token.colorFillTertiary : token.colorBgContainer,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  background: item.status === "uploading" ? token.colorFillSecondary : token.colorFillTertiary,
                }}
              >
                {item.kind === "image" && item.thumbnailUrl ? (
                  <NextImage
                    alt={item.title ?? item.originalName}
                    src={item.thumbnailUrl}
                    fill
                    sizes="100px"
                    unoptimized
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <PhiFlexControl align="center" justify="center" style={{ width: "100%", height: "100%" }}>
                    <PhiMediaKindIcon kind={item.kind} size={32} />
                  </PhiFlexControl>
                )}
                {item.kind === "image" && displayDimensions ? (
                  <PhiTypographyControl
                    style={{
                      position: "absolute",
                      left: 6,
                      bottom: 6,
                      color: token.colorTextLightSolid,
                      fontSize: uploadTileLabelFontSize,
                      lineHeight: 1,
                      textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.85)",
                      pointerEvents: "none",
                    }}
                  >
                    {displayDimensions.width}x{displayDimensions.height}
                  </PhiTypographyControl>
                ) : null}
                {item.status === "uploading" ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255, 255, 255, 0.68)",
                      color: token.colorText,
                    }}
                  >
                    <PhiProgressControl type="circle" percent={item.progress} size={48} />
                  </div>
                ) : null}
                {item.status === "error" ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(128, 0, 0, 0.38)",
                      color: token.colorTextLightSolid,
                      padding: 12,
                      textAlign: "center",
                    }}
                  >
                    <PhiTypographyControl style={{ color: token.colorTextLightSolid }}>
                      {item.error ?? labels.uploadFailedText}
                    </PhiTypographyControl>
                  </div>
                ) : null}
                {item.deleting ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0, 0, 0, 0.28)",
                      color: "#fff",
                    }}
                  >
                    <PhiSpinControl />
                  </div>
                ) : null}
              </div>
              <PhiFlexControl vertical gap={6} style={{ padding: token.paddingSM }}>
                <PhiFlexControl align="center" justify="space-between" gap={8}>
                  <PhiTypographyControl strong ellipsis title={item.title ?? item.originalName} style={{ minWidth: 0 }}>
                    {item.title ?? item.originalName}
                  </PhiTypographyControl>
                </PhiFlexControl>
                <PhiFlexControl align="center" justify="space-between" gap={8} wrap>
                  <PhiTypographyControl type="secondary" ellipsis style={{ display: "block", minWidth: 0 }}>
                    {resolvePhiMediaAssetTypeLabel(item.kind, item.contentType, item.originalName)}
                  </PhiTypographyControl>
                  {allowDelete && item.assetId > 0 ? (
                    <PhiButtonControl
                      ariaLabel={labels.deleteLabel}
                      icon={<PhiIcon name="delete" size="inherit" />}
                      type="text"
                      size="small"
                      danger
                      onClick={() => {
                        void deleteUploadedAsset(item.localId, item.assetId);
                      }}
                    />
                  ) : null}
                </PhiFlexControl>
                <PhiFlexControl align="center" gap={6} wrap>
                  <PhiTagControl color={item.status === "error" ? "red" : item.status === "uploading" ? "blue" : "green"}>
                    {resolveUploadStatusLabel(item, labels)}
                  </PhiTagControl>
                  {item.status === "error" && item.file ? (
                    <PhiButtonControl
                      type="primary"
                      size="small"
                      onClick={() => {
                        void upload.retry(item.localId);
                      }}
                      label={labels.retryLabel}
                    />
                  ) : null}
                </PhiFlexControl>
              </PhiFlexControl>
            </div>
          );
        })}
      />
    </PhiFlexControl>
  );
}

export function PhiAreaUploadWidget(props: PhiAreaUploadWidgetProps) {
  return <PhiAreaUploadBinding {...props} />;
}
