"use client";

import { DeleteOutlined } from "@ant-design/icons";
import { Flex, Skeleton, Typography } from "antd";
import NextImage from "next/image";
import type { CSSProperties } from "react";

import { PhiMediaKind, isPhiMediaAssetPublic } from "../../constants/media";
import type { PhiControlSize } from "../../types/control";
import type { PhiMediaAssetTile } from "../../types/media";
import { resolvePhiMediaAssetDisplayDimensions } from "../media/phi-image-preview-data";
import { PhiMediaKindIcon } from "../media/phi-media-kind-icon";
import { PhiMediaRestrictedIcon } from "../media/phi-media-restricted-icon";
import { usePhiConfig } from "../root/phi-config-provider";
import { PhiButtonControl } from "./phi-button-control";
import {
  PhiCollectionLayoutControl,
  type PhiCollectionLayoutControlProps,
} from "./phi-collection-layout-control";

function resolveAssetTypeLabel(kind: string, contentType: string, originalName: string) {
  const normalizedContentType = contentType.trim().toLowerCase();
  if (kind === PhiMediaKind.Image) {
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

export type PhiMediaAssetTileControlProps = {
  asset: PhiMediaAssetTile;
  minColumnWidth: string | number;
  selected?: boolean;
  mode?: "grid" | "masonry" | "stack";
  size?: PhiControlSize;
  disabled?: boolean;
  onSelect?: (asset: PhiMediaAssetTile) => void;
  onDelete?: (asset: PhiMediaAssetTile) => void;
  deleteLabel?: string;
  showTypeLabel?: boolean;
  showDeleteAction?: boolean;
  showDimensions?: boolean;
  showIdLabel?: boolean;
};

export function PhiMediaAssetTileControl({
  asset,
  minColumnWidth,
  selected = false,
  mode = "grid",
  size = "medium",
  disabled = false,
  onSelect,
  onDelete,
  deleteLabel,
  showTypeLabel = true,
  showDeleteAction = false,
  showDimensions = true,
  showIdLabel = false,
}: PhiMediaAssetTileControlProps) {
  const { token } = usePhiConfig();
  const compact = size === "small";
  const assetTileIconSize = compact ? 20 : 24;
  const assetTileLabelFontSize = compact ? token.fontSizeSM : token.fontSize;
  const isSelectable = Boolean(onSelect) && !disabled;
  const isPublic = isPhiMediaAssetPublic(asset.deliveryPolicy, asset.lifecycleStatus);
  const isRestricted = !isPublic;
  const displayDimensions = resolvePhiMediaAssetDisplayDimensions(asset);
  const imageUrl = asset.thumbnailUrl ?? asset.previewUrl ?? asset.deliveryUrl;
  const cardStyle: CSSProperties = {
    border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    overflow: "hidden",
    padding: 0,
    cursor: isSelectable ? "pointer" : "default",
    background: selected ? token.colorFillQuaternary : token.colorBgContainer,
    boxShadow: selected ? token.boxShadowTertiary : "none",
    opacity: disabled ? 0.65 : undefined,
    textAlign: "left",
    width: "100%",
    height: mode === "stack" ? "100%" : undefined,
    position: "relative",
    isolation: "isolate",
  };

  return (
    <div
      role={isSelectable ? "button" : undefined}
      aria-pressed={isSelectable ? selected : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={isSelectable ? 0 : undefined}
      style={cardStyle}
      onClick={isSelectable ? () => onSelect?.(asset) : undefined}
      onKeyDown={isSelectable
        ? (event) => {
            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }

            event.preventDefault();
            onSelect?.(asset);
          }
        : undefined}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          background: token.colorFillTertiary,
          overflow: "hidden",
        }}
      >
        {asset.kind === PhiMediaKind.Image ? (
          <NextImage
            alt={asset.altText ?? asset.title ?? asset.originalName}
            src={imageUrl}
            fill
            unoptimized={!isPublic}
            sizes={typeof minColumnWidth === "number" ? `${minColumnWidth}px` : minColumnWidth}
            placeholder={asset.blurDataUrl ? "blur" : "empty"}
            blurDataURL={asset.blurDataUrl ?? undefined}
            style={{ objectFit: "cover" }}
          />
        ) : isRestricted ? (
          <Flex align="center" justify="center" style={{ width: "100%", height: "100%" }}>
            <PhiMediaRestrictedIcon size={assetTileIconSize} title="restricted" />
          </Flex>
        ) : (
          <Flex align="center" justify="center" style={{ width: "100%", height: "100%" }}>
            <PhiMediaKindIcon kind={asset.kind} size={assetTileIconSize} />
          </Flex>
        )}
        {showDimensions && asset.kind === PhiMediaKind.Image && displayDimensions ? (
          <Typography.Text
            style={{
              position: "absolute",
              left: "0.375rem",
              top: "0.375rem",
              color: "#fff",
              fontSize: assetTileLabelFontSize,
              lineHeight: 1,
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.85)",
              pointerEvents: "none",
            }}
          >
            {displayDimensions.width}x{displayDimensions.height}
          </Typography.Text>
        ) : null}
        {showIdLabel && asset.id != null ? (
          <Typography.Text
            style={{
              position: "absolute",
              top: "0.375rem",
              right: "0.375rem",
              color: "#fff",
              fontSize: assetTileLabelFontSize,
              lineHeight: 1,
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.95), 0 0 4px rgba(0, 0, 0, 0.85)",
              pointerEvents: "none",
            }}
          >
            #{asset.id}
          </Typography.Text>
        ) : null}
        <div
          style={{
            position: "absolute",
            zIndex: 1,
            right: 0,
            bottom: 0,
            left: 0,
            paddingBlock: token.paddingXXS,
            paddingInline: token.paddingXS,
            background: token.colorBgMask,
          }}
        >
          <Typography.Text
            strong
            ellipsis
            title={asset.title ?? asset.originalName}
            style={{
              display: "block",
              color: token.colorTextLightSolid,
              fontSize: assetTileLabelFontSize,
              lineHeight: 1,
            }}
          >
            {asset.title ?? asset.originalName}
          </Typography.Text>
        </div>
      </div>
      {showTypeLabel || showDeleteAction ? (
        <Flex
          align="center"
          justify="space-between"
          gap={token.paddingXS}
          wrap
          style={{
            minHeight: token.controlHeightSM,
            paddingInline: compact ? token.paddingXS : token.paddingSM,
            background: "rgba(255, 255, 255, 0.78)",
          }}
        >
          {showTypeLabel ? (
            <Typography.Text
              ellipsis
              style={{
                display: "block",
                minWidth: 0,
                color: "rgba(0, 0, 0, 0.88)",
                fontSize: assetTileLabelFontSize,
              }}
            >
              {resolveAssetTypeLabel(asset.kind, asset.contentType, asset.originalName)}
            </Typography.Text>
          ) : <span />}
          {showDeleteAction && onDelete ? (
            <span
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <PhiButtonControl
                ariaLabel={deleteLabel}
                icon={<DeleteOutlined />}
                type="text"
                size="small"
                danger
                disabled={disabled}
                onClick={() => onDelete(asset)}
              />
            </span>
          ) : null}
        </Flex>
      ) : null}
    </div>
  );
}

export type PhiMediaAssetCollectionSkeletonControlProps = Pick<
  PhiCollectionLayoutControlProps,
  "mode" | "gap" | "minColumnWidth"
> & {
  active?: boolean;
  count?: number;
  size?: PhiControlSize;
};

export function PhiMediaAssetCollectionSkeletonControl({
  mode,
  gap,
  minColumnWidth,
  active = true,
  count = 10,
  size = "medium",
}: PhiMediaAssetCollectionSkeletonControlProps) {
  const { token } = usePhiConfig();
  const compact = size === "small";
  const items = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflow: "hidden",
        background: token.colorBgContainer,
        width: "100%",
        minWidth: 0,
        position: "relative",
        isolation: "isolate",
      }}
    >
      <div
        style={{
          width: "100%",
          minWidth: 0,
          aspectRatio: "1 / 1",
        }}
      >
        <Skeleton.Input
          active={active}
          block
          style={{
            display: "block",
            width: "100%",
            minWidth: 0,
            maxWidth: "100%",
            height: "100%",
            borderRadius: 0,
          }}
        />
      </div>
      <Flex
        style={{
          minHeight: token.controlHeightSM,
          paddingInline: compact ? token.paddingXS : token.paddingSM,
          background: "rgba(255, 255, 255, 0.78)",
        }}
        align="center"
        justify="space-between"
        gap={token.paddingXS}
      >
        <Skeleton.Input
          active={active}
          size="small"
          style={{
            width: "55%",
            minWidth: 0,
            height: token.fontSize * token.lineHeight,
          }}
        />
        <Skeleton.Button
          active={active}
          size="small"
          shape="circle"
          style={{
            width: token.controlHeightSM,
            minWidth: token.controlHeightSM,
            height: token.controlHeightSM,
          }}
        />
      </Flex>
    </div>
  ));

  return (
    <PhiCollectionLayoutControl
      mode={mode}
      gap={gap}
      minColumnWidth={minColumnWidth}
      items={items}
    />
  );
}
