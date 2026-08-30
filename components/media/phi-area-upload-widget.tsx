"use client";

import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Flex, Progress, Space, Spin, Tag, Typography, Upload } from "antd";
import type { UploadProps } from "antd";
import NextImage from "next/image";
import { useMemo, useRef, useState } from "react";

import type { PhiCmsAreaUploadWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/area-upload/config";
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
  PhiMediaUploadError,
  resolvePhiMediaUploadInitOptions,
  runPhiMediaUploadSession,
} from "./media-upload-flow";
import {
  PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
  readPhiMediaUploadErrorMessage,
} from "./phi-media-upload";
import { usePhiImagePreviewStore, type PhiImagePreviewStoreState } from "./phi-image-preview-store";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "./phi-media-scope-controller";
import {
  applyPhiAssetCollectionData,
  buildPhiAssetCollectionQuery,
  PHI_ASSET_COLLECTION_DATA_SOURCE,
} from "./asset-collection-runtime";
import { PhiFileDropGuard } from "./phi-file-drop-guard";
import { usePhiApplicationFeedback } from "../runtime/use-phi-application-feedback";
import { usePhiConfig } from "../root/phi-config-provider";
import { usePhiCollectionProviderAction } from "../widgets/client/shared/phi-collection-provider";

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
 * The Widget's own wording over the shared reading of every refusal.
 *
 * It used to know about duplicates and nothing else, and fell through to `error.message` -- which put a
 * control plane string in front of a person for every other refusal, including the two the Site itself
 * now states. Only the duplicate has a label of its own here; the rest come from one place.
 */
function resolveUploadErrorMessage(error: unknown, labels: PhiAreaUploadWidgetLabels) {
  const typedError = error as { code?: unknown; message?: unknown } | null;
  if (
    (error instanceof PhiMediaUploadError && error.code === "media_asset_exists") ||
    typedError?.code === "media_asset_exists" ||
    typedError?.message === "media_asset_exists"
  ) {
    return labels.assetExistsLabel;
  }

  return readPhiMediaUploadErrorMessage(error, {
    ...PHI_MEDIA_UPLOAD_DEFAULT_LABELS,
    errorGeneric: labels.uploadFailedText,
    errorDuplicate: labels.assetExistsLabel,
    errorStorageUnreachable: labels.uploadStorageUnreachableText,
  });
}

function resolveAssetTypeLabel(kind: PhiMediaAssetTile["kind"], contentType: string, originalName: string) {
  const normalizedContentType = contentType.trim().toLowerCase();
  if (kind === "image") {
    const subtype = normalizedContentType.startsWith("image/")
      ? normalizedContentType.split("/", 2)[1]
      : null;
    if (subtype) {
      return subtype.split(";")[0].trim();
    }

    return normalizedContentType || "image";
  }

  const extension = originalName.trim().split(".").pop()?.trim().toLowerCase();
  if (extension && extension !== originalName.trim().toLowerCase()) {
    return extension;
  }

  const [, subtype] = normalizedContentType.split("/", 2);
  if (subtype) {
    return subtype.split(";")[0].trim();
  }

  return kind;
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

  function startUploadWallItem(file: File, localId?: string) {
    const normalizedTitle = file.name.replace(/\.[^.]+$/, "").trim() || file.name;
    const nextLocalId = localId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setUploadWall((current) => [
      {
        localId: nextLocalId,
        assetId: -1,
        file,
        title: normalizedTitle,
        originalName: file.name,
        thumbnailUrl: null,
        previewUrl: null,
        contentType: file.type,
        kind: resolvePhiMediaKindFromContentType(file.type),
        width: null,
        height: null,
        presentationFlags: uploadInitOptions.presentationFlags ?? 0,
        progress: 0,
        status: "uploading",
        deleting: false,
        error: null,
      },
      ...current.filter((item) => item.localId !== nextLocalId),
    ]);
    return nextLocalId;
  }

  async function uploadFileToWallItem(file: File, localId?: string) {
    const nextLocalId = startUploadWallItem(file, localId);

    try {
      const payload = await runPhiMediaUploadSession(file, (progress) => {
        setUploadWall((current) =>
          current.map((item) =>
            item.localId === nextLocalId ? { ...item, progress, status: "uploading" } : item,
          ),
        );
      }, uploadInitOptions);
      const uploadedTile = normalizePhiImagePreviewTile(payload.asset, []);
      setUploadWall((current) =>
        current.map((item) =>
          item.localId === nextLocalId ? buildUploadWallItem(uploadedTile, nextLocalId) : item,
        ),
      );
      onUploadComplete?.();
      showUploadMessage("success", labels.uploadSuccessTemplate.replace("%1", file.name));
    } catch (error) {
      const errorMessage = resolveUploadErrorMessage(error, labels);
      setUploadWall((current) =>
        current.map((item) =>
          item.localId === nextLocalId
            ? {
                ...item,
                progress: 100,
                status: "error",
                error: errorMessage,
              }
            : item,
        ),
      );
      showUploadMessage("error", errorMessage);
    }
  }

  const customRequest: UploadProps["customRequest"] = async (options) => {
    const uploadOptions = options as Parameters<NonNullable<UploadProps["customRequest"]>>[0];
    const { file, onProgress, onSuccess, onError } = uploadOptions;
    const uploadFile = file as File;
    let localId = "";
    try {
      localId = await Promise.resolve(startUploadWallItem(uploadFile));
      const payload = await runPhiMediaUploadSession(uploadFile, (progress) => {
        onProgress?.({ percent: progress });
        setUploadWall((current) =>
          current.map((item) =>
            item.localId === localId ? { ...item, progress, status: "uploading" } : item,
          ),
        );
      }, uploadInitOptions);
      const uploadedTile = normalizePhiImagePreviewTile(payload.asset, []);
      setUploadWall((current) =>
        current.map((item) =>
          item.localId === localId ? buildUploadWallItem(uploadedTile, localId) : item,
        ),
      );
      onUploadComplete?.();
      onSuccess?.(payload.asset);
    } catch (error) {
      onError?.(error as Error);
      showUploadMessage("error", resolveUploadErrorMessage(error, labels));
      setUploadWall((current) =>
        current.map((item) =>
          item.localId === localId
            ? {
                ...item,
                progress: 100,
                status: "error",
                error: resolveUploadErrorMessage(error, labels),
              }
            : item,
        ),
      );
    }
  };

  const uploadProps: UploadProps = {
    multiple,
    showUploadList: false,
    accept,
    customRequest,
  };

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
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
        <Upload.Dragger
          {...uploadProps}
          style={{
            padding: 0,
            width: "100%",
            borderColor: isDragActive ? token.colorPrimary : undefined,
            background: isDragActive ? token.colorFillQuaternary : undefined,
          }}
        >
          <Space
            orientation="vertical"
            align="center"
            size={4}
            style={{
              width: "100%",
              minHeight: uploadTileMinHeight,
              justifyContent: "center",
              cursor: isDragActive ? "copy" : "default",
            }}
          >
            <UploadOutlined style={{ fontSize: uploadTileIconSize, color: token.colorTextSecondary }} />
            <Typography.Text strong>{labels.dropTitle}</Typography.Text>
            <Typography.Text type="secondary">{labels.dropHint}</Typography.Text>
          </Space>
        </Upload.Dragger>
      </div>

      <PhiCollectionLayoutControl
        mode="grid"
        gap={token.paddingSM}
        minColumnWidth={uploadTileFrameSize}
        items={uploadWall.map((item) => {
          const displayDimensions = resolveUploadWallDisplayDimensions(item);

          return (
            <div
              key={item.localId}
              style={{
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: token.borderRadiusLG,
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
                  <Flex align="center" justify="center" style={{ width: "100%", height: "100%" }}>
                    <PhiMediaKindIcon kind={item.kind} size={32} />
                  </Flex>
                )}
                {item.kind === "image" && displayDimensions ? (
                  <Typography.Text
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
                  </Typography.Text>
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
                    <Progress type="circle" percent={item.progress} size={48} />
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
                    <Typography.Text style={{ color: token.colorTextLightSolid }}>
                      {item.error ?? labels.uploadFailedText}
                    </Typography.Text>
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
                    <Spin />
                  </div>
                ) : null}
              </div>
              <Flex vertical gap={6} style={{ padding: token.paddingSM }}>
                <Flex align="center" justify="space-between" gap={8}>
                  <Typography.Text strong ellipsis title={item.title ?? item.originalName} style={{ minWidth: 0 }}>
                    {item.title ?? item.originalName}
                  </Typography.Text>
                </Flex>
                <Flex align="center" justify="space-between" gap={8} wrap>
                  <Typography.Text type="secondary" ellipsis style={{ display: "block", minWidth: 0 }}>
                    {resolveAssetTypeLabel(item.kind, item.contentType, item.originalName)}
                  </Typography.Text>
                  {allowDelete && item.assetId > 0 ? (
                    <Button
                      aria-label={labels.deleteLabel}
                      icon={<DeleteOutlined />}
                      type="text"
                      size="small"
                      danger
                      onClick={() => {
                        void deleteUploadedAsset(item.localId, item.assetId);
                      }}
                    />
                  ) : null}
                </Flex>
                <Flex align="center" gap={6} wrap>
                  <Tag color={item.status === "error" ? "red" : item.status === "uploading" ? "blue" : "green"}>
                    {resolveUploadStatusLabel(item, labels)}
                  </Tag>
                  {item.status === "error" && item.file ? (
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => {
                        void uploadFileToWallItem(item.file as File, item.localId);
                      }}
                    >
                      {labels.retryLabel}
                    </Button>
                  ) : null}
                </Flex>
              </Flex>
            </div>
          );
        })}
      />
    </Flex>
  );
}

export function PhiAreaUploadWidget(props: PhiAreaUploadWidgetProps) {
  return <PhiAreaUploadBinding {...props} />;
}
