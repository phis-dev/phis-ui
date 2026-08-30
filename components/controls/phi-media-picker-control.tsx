"use client";

import type { ReactNode } from "react";
import { Empty, Flex, Typography } from "antd";
import { PictureOutlined, ReloadOutlined } from "@ant-design/icons";

import type { PhiMediaAssetTile } from "../../types/media";
import { usePhiConfig } from "../root/phi-config-provider";
import type { PhiControlOption } from "./phi-control-options";
import { PhiButtonControl } from "./phi-button-control";
import { PhiCascaderControl } from "./phi-cascader-control";
import { PhiSelectControl } from "./phi-select-control";
import { PhiCollectionLayoutControl } from "./phi-collection-layout-control";
import {
  PhiMediaAssetCollectionSkeletonControl,
  PhiMediaAssetTileControl,
} from "./phi-media-asset-tile-control";
import {
  PHI_MEDIA_PICKER_COLUMN_WIDTH_STEP,
  PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH,
  PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH,
  PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH,
  normalizePhiMediaPickerMinColumnWidth,
} from "./phi-media-picker-control-contract";
import { PhiPaginationControl } from "./phi-pagination-control";
import { PhiPopoverControl } from "./phi-popover-control";
import { PhiSliderControl } from "./phi-slider-control";
import { PhiTextControl } from "./phi-text-control";
import type {
  PhiPickerPlacement,
  PhiPickerTransactionCallbacks,
} from "./phi-picker-control-contract";
import { usePhiImmediatePicker } from "./use-phi-immediate-picker";

export type PhiMediaPickerControlProps = PhiPickerTransactionCallbacks<number | null> & {
  open?: boolean;
  value?: number | null;
  assets: readonly PhiMediaAssetTile[];
  /**
   * The Spaces this viewer may work in. Empty unless the surface is one that may name a Space at all,
   * so an authoring picker never renders the selector.
   */
  spaces?: readonly PhiControlOption[];
  spaceValue?: string | null;
  folders?: readonly PhiControlOption[];
  folderValue?: string;
  query?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  minColumnWidth?: number;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placement?: PhiPickerPlacement;
  showSearchBar?: boolean;
  showFolderFilter?: boolean;
  showPagination?: boolean;
  trigger?: ReactNode;
  labels?: Partial<{
    trigger: string;
    title: string;
    search: string;
    folder: string;
    space: string;
    empty: string;
    clear: string;
    reload: string;
    tileSize: string;
  }>;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  popupRootClassName?: string;
  onQueryChange?: (query: string) => void;
  onSpaceChange?: (space: string) => void;
  onFolderChange?: (folder: string) => void;
  onPageChange?: (page: number, pageSize: number) => void;
  onMinColumnWidthChange?: (minColumnWidth: number) => void;
  onReload?: () => void;
};

export function PhiMediaPickerControl({
  open,
  value = null,
  assets,
  spaces = [],
  spaceValue = null,
  folders = [],
  folderValue = "/",
  query = "",
  page = 1,
  pageSize = 20,
  total = assets.length,
  minColumnWidth = PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH,
  loading,
  disabled,
  readOnly,
  placement = "left",
  showSearchBar = true,
  showFolderFilter = true,
  showPagination = true,
  trigger,
  labels,
  getPopupContainer,
  popupRootClassName,
  onOpenChange,
  onQueryChange,
  onSpaceChange,
  onFolderChange,
  onPageChange,
  onMinColumnWidthChange,
  onReload,
  onChange,
  onCommit,
  onDiscard,
}: PhiMediaPickerControlProps) {
  const { token } = usePhiConfig();
  const locked = disabled || readOnly;
  const resolvedMinColumnWidth = normalizePhiMediaPickerMinColumnWidth(minColumnWidth);
  const picker = usePhiImmediatePicker({
    value,
    open,
    disabled: locked,
    onChange,
    onCommit,
    onDiscard,
    onOpenChange,
  });
  const selected = assets.find((asset) => asset.id === picker.value) ?? null;
  const tileItems = assets.map((asset) => (
    <PhiMediaAssetTileControl
      key={asset.id}
      asset={asset}
      minColumnWidth={resolvedMinColumnWidth}
      selected={asset.id === picker.value}
      size="small"
      disabled={locked}
      showTypeLabel={false}
      showDeleteAction={false}
      showDimensions={false}
      showIdLabel={false}
      onSelect={(nextAsset) => {
        picker.changeValue(nextAsset.id);
        picker.closePicker("commit");
      }}
    />
  ));
  const content = (
    <Flex
      vertical
      gap={token.paddingSM}
      style={{
        width: "min(560px, calc(100vw - 48px))",
        height: "min(480px, calc(100dvh - 48px))",
        minHeight: 0,
      }}
    >
      <Typography.Text strong>{labels?.title ?? "Select media"}</Typography.Text>
      <Flex gap={token.paddingSM} align="center" wrap>
        {showSearchBar ? (
          <div style={{ flex: "1 1 220px" }}>
            <PhiTextControl
              inputType="search"
              value={query}
              size="small"
              placeholder={labels?.search ?? "Search"}
              disabled={locked}
              onChange={(next) => onQueryChange?.(next ?? "")}
            />
          </div>
        ) : null}
        {spaces.length > 1 ? (
          <div style={{ flex: "0 1 160px" }}>
            <PhiSelectControl
              value={spaceValue ?? undefined}
              options={spaces}
              size="small"
              placeholder={labels?.space ?? "Space"}
              disabled={locked}
              getPopupContainer={getPopupContainer}
              popupRootClassName={popupRootClassName}
              onChange={(next) => { if (typeof next === "string" && next) onSpaceChange?.(next); }}
            />
          </div>
        ) : null}
        {showFolderFilter ? (
          <div style={{ flex: "1 1 180px" }}>
            <PhiCascaderControl
              value={folderValue}
              options={folders}
              allowRoot
              rootValue="/"
              separator="/"
              size="small"
              placeholder={labels?.folder ?? "Folder"}
              disabled={locked}
              getPopupContainer={getPopupContainer}
              classNames={popupRootClassName ? { popup: { root: popupRootClassName } } : undefined}
              onChange={(next) => onFolderChange?.(next ?? "/")}
            />
          </div>
        ) : null}
        <PhiButtonControl
          ariaLabel={labels?.reload ?? "Reload"}
          tooltip={labels?.reload ?? "Reload"}
          icon={<ReloadOutlined />}
          size="small"
          disabled={locked}
          onClick={onReload}
        />
      </Flex>
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
        {loading && assets.length === 0 ? (
          <PhiMediaAssetCollectionSkeletonControl
            mode="grid"
            gap={token.paddingSM}
            minColumnWidth={resolvedMinColumnWidth}
            count={Math.min(pageSize, 12)}
            size="small"
          />
        ) : assets.length === 0 ? (
          <Empty description={labels?.empty ?? "No media"} />
        ) : (
          <PhiCollectionLayoutControl
            mode="grid"
            gap={token.paddingSM}
            minColumnWidth={resolvedMinColumnWidth}
            items={tileItems}
          />
        )}
      </div>
      <Flex align="center" gap={token.paddingSM} style={{ flex: "0 0 auto", minWidth: 0 }}>
        <Typography.Text
          type="secondary"
          ellipsis
          style={{ flex: "0 1 180px", minWidth: 0 }}
        >
          {selected?.title || selected?.originalName || ""}
        </Typography.Text>
        <Flex align="center" gap={token.paddingXS} style={{ flex: "1 1 160px", minWidth: 120 }}>
          <PhiSliderControl
            ariaLabel={labels?.tileSize ?? "Tile size"}
            value={resolvedMinColumnWidth}
            min={PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH}
            max={PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH}
            step={PHI_MEDIA_PICKER_COLUMN_WIDTH_STEP}
            tooltipSuffix=" px"
            disabled={locked}
            style={{ flex: "1 1 auto", minWidth: 0 }}
            onChange={onMinColumnWidthChange}
          />
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, whiteSpace: "nowrap" }}>
            {resolvedMinColumnWidth}px
          </Typography.Text>
        </Flex>
        <PhiButtonControl
          label={labels?.clear ?? "Clear"}
          size="small"
          disabled={locked || picker.value == null}
          onClick={() => picker.changeValue(null)}
        />
        {showPagination ? (
          <PhiPaginationControl
            page={page}
            pageSize={pageSize}
            total={total}
            size="small"
            disabled={locked}
            showSizeChanger
            getPopupContainer={getPopupContainer}
            popupRootClassName={popupRootClassName}
            onChange={(next) => onPageChange?.(next.page, next.pageSize)}
          />
        ) : null}
      </Flex>
    </Flex>
  );
  return (
    <PhiPopoverControl
      open={picker.open}
      content={content}
      placement={placement}
      disabled={locked}
      getPopupContainer={getPopupContainer}
      rootClassName={popupRootClassName}
      onOpenChange={picker.handleOpenChange}
    >
      {trigger ?? (
        <span>
          <PhiButtonControl
            block
            icon={<PictureOutlined />}
            label={labels?.trigger ?? "Select media"}
            disabled={locked}
            onClick={picker.openPicker}
          />
        </span>
      )}
    </PhiPopoverControl>
  );
}
