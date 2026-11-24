"use client";

import { useState, type ReactNode } from "react";
import { Flex, Typography } from "antd";
import type { PhisMediaSourceItem } from "@phis/contracts/media-source";

import type { PhiMediaAssetTile } from "../../types/media";
import { usePhiConfig } from "../root/phi-config-provider";
import type { PhiControlOption } from "./phi-control-options";
import { PhiButtonControl } from "./phi-button-control";
import { PhiCascaderControl } from "./phi-cascader-control";
import { PhiEmptyControl } from "./phi-empty-control";
import { PhiSelectControl } from "./phi-select-control";
import { PhiCollectionLayoutControl } from "./phi-collection-layout-control";
import {
  PhiMediaAssetCollectionSkeletonControl,
  PhiMediaAssetTileControl,
} from "./phi-media-asset-tile-control";
import { PhiMediaSourceItemTileControl } from "./phi-media-source-item-tile-control";
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
import { PhiIcon } from "../shell/phi-icon";

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
  /**
   * The places a file can be chosen from: the Site's library first, then each media source. Empty
   * unless there is a source to choose and the picker stands on the Site Space, so a picker without
   * one never renders the switch.
   */
  sources?: readonly PhiControlOption[];
  /** Which of `sources` is shown; `""` is the Site's library. */
  sourceValue?: string;
  /** What the source offers, in the order it answered; drawn instead of the library's tiles. */
  sourceItems?: readonly PhisMediaSourceItem[];
  /** Whether the source has a further page, which "Load more" asks for. */
  sourceHasMore?: boolean;
  /** The item whose import is in flight, if any. */
  importingItemId?: string | null;
  /** Why the last import did not work, said above the tiles. */
  sourceNotice?: string | null;
  /**
   * The upload surface, where the picker offers one: the Upload button beside Reload shows it above the
   * library's tiles -- the Media library's own upload surface (`PhiAreaUploadBinding`, one file), which
   * the host draws, so a picker without upload carries no transport. It is drawn only while the picker is
   * open and the panel shown, so closing either stops what is on its way. `choose` chooses an Asset that
   * arrived as if it had been picked in the library, and closes the picker. Absent, no upload is offered.
   */
  uploadPanel?: (choose: (assetId: number) => void) => ReactNode;
  /** Why the last upload did not work, or the Folder could not be opened, said above the library's tiles. */
  uploadNotice?: string | null;
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
  /**
   * Where the picker opens; below the trigger unless the caller says otherwise. The library is wider than
   * most of the panels it is opened from, so beside the trigger it ran past the window's edge and the
   * page scrolled sideways (the Theme's Link preview, 2026-11-24). Centred below, Ant Design's overflow
   * adjustment slides it sideways and upwards into the window (a corner placement such as `bottomLeft`
   * is not slid upwards), and its width is capped to the window.
   */
  placement?: PhiPickerPlacement;
  showSearchBar?: boolean;
  showFolderFilter?: boolean;
  showPagination?: boolean;
  trigger?: ReactNode;
  /** Which Assets may be chosen. The others are listed and greyed out; absent, every Asset may be. */
  isAssetSelectable?: (asset: PhiMediaAssetTile) => boolean;
  labels?: Partial<{
    trigger: string;
    title: string;
    search: string;
    folder: string;
    space: string;
    empty: string;
    /** What an empty or failed source says, where the library's `empty` would be the wrong words. */
    sourceEmpty: string;
    clear: string;
    reload: string;
    tileSize: string;
    source: string;
    importing: string;
    loadMore: string;
    upload: string;
  }>;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  popupRootClassName?: string;
  onQueryChange?: (query: string) => void;
  onSpaceChange?: (space: string) => void;
  onSourceChange?: (source: string) => void;
  /**
   * An item was chosen. Answers the Asset it became -- chosen then as if it had been picked in the
   * library -- or null where nothing was imported and the picker stays as it is.
   */
  onSourceItemSelect?: (item: PhisMediaSourceItem) => Promise<PhiMediaAssetTile | null>;
  onSourceLoadMore?: () => void;
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
  sources = [],
  sourceValue = "",
  sourceItems = [],
  sourceHasMore = false,
  importingItemId = null,
  sourceNotice = null,
  uploadPanel,
  uploadNotice = null,
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
  placement = "bottom",
  showSearchBar = true,
  showFolderFilter = true,
  showPagination = true,
  trigger,
  isAssetSelectable,
  labels,
  getPopupContainer,
  popupRootClassName,
  onOpenChange,
  onQueryChange,
  onSpaceChange,
  onSourceChange,
  onSourceItemSelect,
  onSourceLoadMore,
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
  // A source is shown while one other than the library is named; its items stand where the tiles do.
  const sourceActive = sources.length > 1 && sourceValue !== "";
  const importing = importingItemId != null;
  const [uploadShown, setUploadShown] = useState(false);
  const uploadOffered = uploadPanel != null && !sourceActive;
  const sourceTileItems = sourceItems.map((item) => (
    <PhiMediaSourceItemTileControl
      key={item.id}
      title={item.title}
      thumbnailUrl={item.thumbnailUrl}
      credit={item.credit}
      minColumnWidth={resolvedMinColumnWidth}
      busy={importingItemId === item.id}
      busyLabel={labels?.importing}
      disabled={locked || importing}
      onSelect={() => {
        void onSourceItemSelect?.(item).then((asset) => {
          if (!asset) return;
          picker.changeValue(asset.id);
          picker.closePicker("commit");
        });
      }}
    />
  ));
  const tileItems = assets.map((asset) => (
    <PhiMediaAssetTileControl
      key={asset.id}
      asset={asset}
      minColumnWidth={resolvedMinColumnWidth}
      selected={asset.id === picker.value}
      size="small"
      disabled={locked || (isAssetSelectable != null && !isAssetSelectable(asset))}
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
        {sources.length > 1 ? (
          <div style={{ flex: "0 1 160px" }}>
            <PhiSelectControl
              value={sourceValue}
              options={sources}
              size="small"
              ariaLabel={labels?.source ?? "Source"}
              placeholder={labels?.source ?? "Source"}
              disabled={locked || importing}
              getPopupContainer={getPopupContainer}
              popupRootClassName={popupRootClassName}
              onChange={(next) => { if (typeof next === "string") onSourceChange?.(next); }}
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
          icon={<PhiIcon name="reload" size="inherit" />}
          size="small"
          disabled={locked}
          onClick={onReload}
        />
        {uploadOffered ? (
          <PhiButtonControl
            icon={<PhiIcon name="upload" size="inherit" />}
            ariaLabel={labels?.upload ?? "Upload"}
            tooltip={labels?.upload ?? "Upload"}
            type={uploadShown ? "primary" : "default"}
            size="small"
            disabled={locked}
            onClick={() => setUploadShown((current) => !current)}
          />
        ) : null}
      </Flex>
      {uploadOffered && uploadShown && picker.open && !locked ? uploadPanel((assetId) => {
        setUploadShown(false);
        picker.changeValue(assetId);
        picker.closePicker("commit");
      }) : null}
      {sourceActive && sourceNotice ? (
        <Typography.Text type="danger" role="alert">{sourceNotice}</Typography.Text>
      ) : null}
      {!sourceActive && uploadNotice ? (
        <Typography.Text type="danger" role="alert">{uploadNotice}</Typography.Text>
      ) : null}
      <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto" }}>
        {sourceActive ? (
          loading && sourceItems.length === 0 ? (
            <PhiMediaAssetCollectionSkeletonControl
              mode="grid"
              gap={token.paddingSM}
              minColumnWidth={resolvedMinColumnWidth}
              count={Math.min(pageSize, 12)}
              size="small"
            />
          ) : sourceItems.length === 0 ? (
            <PhiEmptyControl description={labels?.sourceEmpty ?? labels?.empty ?? "No media"} />
          ) : (
            <PhiCollectionLayoutControl
              mode="grid"
              gap={token.paddingSM}
              minColumnWidth={resolvedMinColumnWidth}
              items={sourceTileItems}
            />
          )
        ) : loading && assets.length === 0 ? (
          <PhiMediaAssetCollectionSkeletonControl
            mode="grid"
            gap={token.paddingSM}
            minColumnWidth={resolvedMinColumnWidth}
            count={Math.min(pageSize, 12)}
            size="small"
          />
        ) : assets.length === 0 ? (
          <PhiEmptyControl description={labels?.empty ?? "No media"} />
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
        {sourceActive ? (
          sourceHasMore ? (
            <PhiButtonControl
              label={labels?.loadMore ?? "Load more"}
              size="small"
              loading={loading}
              disabled={locked || importing}
              onClick={onSourceLoadMore}
            />
          ) : null
        ) : showPagination ? (
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
            icon={<PhiIcon name="picture" size="inherit" />}
            label={labels?.trigger ?? "Select media"}
            disabled={locked}
            onClick={picker.openPicker}
          />
        </span>
      )}
    </PhiPopoverControl>
  );
}
