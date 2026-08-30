"use client";

import { Empty } from "antd";
import { useEffect, useMemo, useState } from "react";

import { PhiMediaAssetFlags, PhiMediaKind } from "../../constants/media";
import type { PhiCmsInstanceId } from "../../types/cms-instance-id";
import type { PhiCollectionViewBindingModel } from "../../types/collection-provider";
import type { PhiMediaAssetTile, PhiMediaKindValue } from "../../types/media";
import { createPhiSignalSubcontrolAddress } from "../../types/signals";
import { normalizePhiCssSize } from "../layouts/phi-layout-contract";
import { PhiAlertControl } from "../controls/phi-alert-control";
import { PhiButtonControl } from "../controls/phi-button-control";
import { PhiCollectionViewControl } from "../controls/phi-collection-view-control";
import { PhiMultiSelectControl } from "../controls/phi-multi-select-control";
import { PhiSelectControl } from "../controls/phi-select-control";
import { PhiTextControl } from "../controls/phi-text-control";
import { PhiToolbarControl } from "../controls/phi-toolbar-control";
import {
  PhiMediaAssetCollectionSkeletonControl,
  PhiMediaAssetTileControl,
} from "../controls/phi-media-asset-tile-control";
import { usePhiConfig } from "../root/phi-config-provider";
import { usePhiApplicationFeedback } from "../runtime/use-phi-application-feedback";
import type { PhiCmsCollectionViewWidgetConfig } from "../../plugins/runtime-modules/core/widgets/collection-view/config";
import { resolvePhiButtonIcon } from "../widgets/client/shared/phi-button-icons";
import { usePhiControlSignalController } from "../widgets/client/shared/phi-control-signals";
import {
  buildPhiMediaSpaceOptions,
  usePhiMediaSpaceSelectionAllowed,
} from "./media-space-selection";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderValueById,
  combinePhiMediaFlagValues,
  PHI_ASSET_CONTROLLER_STORE_KEY,
  resolvePhiMediaFolderIdFromValue,
} from "./phi-media-scope-controller";
import { applyPhiAssetCollectionData } from "./asset-collection-runtime";
import { PhiAssetFolderControl } from "./phi-asset-folder-control";
import { PhiAreaUploadBinding } from "./phi-area-upload-widget";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS, type PhiAssetWidgetLabels } from "./media-widget-labels";
import { setPhiImagePreviewSelection, usePhiImagePreviewStore } from "./phi-image-preview-store";

const ASSET_FLAG_VALUES = [
  PhiMediaAssetFlags.Featured,
  PhiMediaAssetFlags.Locked,
  PhiMediaAssetFlags.Mask,
] as const;

function readAssetFlagValues(presentationFlags: number | null) {
  return presentationFlags == null ? [] : ASSET_FLAG_VALUES.filter((flag) => (presentationFlags & flag) === flag);
}

function readAssetKinds(value: unknown): PhiMediaKindValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is PhiMediaKindValue =>
    typeof entry === "string" && Object.values(PhiMediaKind).includes(entry as PhiMediaKindValue));
}

export function PhiAssetCollectionViewBinding({
  config,
  binding,
  labels: rawLabels,
  widgetId,
}: {
  config: PhiCmsCollectionViewWidgetConfig;
  binding: PhiCollectionViewBindingModel;
  labels?: unknown;
  widgetId?: PhiCmsInstanceId | null;
}) {
  const labels = (config.presentation.labels ?? rawLabels ?? PHI_MEDIA_WIDGET_DEFAULT_LABELS) as PhiAssetWidgetLabels;
  const { token } = usePhiConfig();
  const { showMessage } = usePhiApplicationFeedback();
  const selectionState = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const query = binding.query;
  const setQuery = binding.setQuery;
  const assets = (binding.data?.items ?? []) as unknown as PhiMediaAssetTile[];
  const folders = Array.isArray(binding.data?.meta?.folders)
    ? binding.data.meta.folders as unknown as typeof selectionState.folders
    : [];
  const queryKind = query.filters?.kind;
  const queryFlags = query.filters?.presentationFlags;
  const queryFolderId = query.filters?.folderId;
  const state = {
    ...selectionState,
    searchQuery: query.search ?? "",
    folderId: typeof queryFolderId === "number" ? queryFolderId : null,
    kinds: readAssetKinds(queryKind),
    presentationFlags: typeof queryFlags === "number" ? queryFlags : null,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    assets,
    folders,
    pagination: { total: binding.data?.total ?? assets.length },
    loading: binding.loading,
    error: binding.error,
    uploadPanelOpen: binding.openPanelKey === "upload",
  };
  useEffect(() => {
    if (binding.data) {
      applyPhiAssetCollectionData(binding.data);
    }
  }, [binding.data]);
  const [searchDraft, setSearchDraft] = useState(state.searchQuery);
  const spaceSelectionAllowed = usePhiMediaSpaceSelectionAllowed();
  const activeSpaceAddress = typeof query.filters?.spaceId === "string" && query.filters.spaceId
    ? query.filters.spaceId
    : selectionState.activeSpace?.address ?? null;
  const spaceOptions = useMemo(
    () => buildPhiMediaSpaceOptions(selectionState.spaces, labels.space),
    [labels.space, selectionState.spaces],
  );
  const presentation = config.presentation;
  const features = config.features;
  const controlSize = presentation.controlSize ?? "small";
  const mode = presentation.mode;
  const gap = normalizePhiCssSize(presentation.gap) ?? token.paddingSM;
  const minColumnWidth = normalizePhiCssSize(presentation.minColumnWidth) ?? 102;
  const selfContained = features.tools.mode === "self-contained";
  const unsupportedFilter = features.filters?.find((filter) =>
    !["kind", "presentationFlags", "folderId"].includes(filter.key));
  const configuredActions = [
    ...(features.actions?.toolbar ?? []),
    ...(features.filters ?? []).flatMap((filter) => filter.actions ?? []),
  ];
  const unsupportedAction = configuredActions.find((action) => action.key !== "upload" && action.key !== "createFolder");
  const folderOptions = useMemo(() => buildPhiMediaFolderCascaderOptions(state.folders), [state.folders]);
  const folderValue = useMemo(() => buildPhiMediaFolderValueById(state.folders, state.folderId), [state.folderId, state.folders]);
  const selectionSignals = usePhiControlSignalController<Record<string, unknown>>({
    key: "assetSelection",
    sender: widgetId == null ? null : createPhiSignalSubcontrolAddress("cms", widgetId, "selection"),
    signalRoutes: config.signalRoutes,
    valueType: "json",
    typeKey: "collection-view",
    coerceValue: (nextValue) => nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)
      ? nextValue as Record<string, unknown>
      : null,
  });
  const actionSignals = usePhiControlSignalController<Record<string, unknown>>({
    key: "collectionAction",
    sender: widgetId == null ? null : createPhiSignalSubcontrolAddress("cms", widgetId, "folder-create"),
    signalRoutes: config.signalRoutes,
    valueType: "json",
    typeKey: "collection-action",
  });
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDraft(state.searchQuery), 0);
    return () => window.clearTimeout(timer);
  }, [state.searchQuery]);
  useEffect(() => {
    if (searchDraft === state.searchQuery) return;
    const timer = window.setTimeout(() => {
      setQuery((current) => ({ ...current, page: 1, search: searchDraft }));
    }, 150);
    return () => window.clearTimeout(timer);
  }, [searchDraft, setQuery, state.searchQuery]);

  if (unsupportedFilter || unsupportedAction) {
    return (
      <PhiAlertControl
        level="error"
        showIcon
        title={unsupportedFilter
          ? `Asset collection filter "${unsupportedFilter.key}" is not supported.`
          : `Asset collection action "${unsupportedAction?.key ?? "unknown"}" is not supported.`}
      />
    );
  }

  async function deleteAsset(asset: PhiMediaAssetTile) {
    try {
      const data = await binding.activate({ actionKey: "delete", itemKey: asset.id, query });
      if (data.error) throw new Error(data.error);
      showMessage({
        level: "success",
        content: labels.grid.deleteSuccessTemplate.replace("%1", asset.title ?? asset.originalName),
        durationSeconds: 2.8,
      });
    } catch (error) {
      showMessage({
        level: "error",
        content: error instanceof Error ? error.message : labels.grid.deleteFailedText,
        durationSeconds: 2.8,
      });
    }
  }

  function selectAsset(asset: PhiMediaAssetTile) {
    setPhiImagePreviewSelection(PHI_ASSET_CONTROLLER_STORE_KEY, asset.id, state.selectedVariantKey ?? null, asset);
    selectionSignals.emitCapability("selection", { area: PHI_ASSET_CONTROLLER_STORE_KEY, assetId: asset.id });
  }

  const filters = selfContained ? (
    <>
      {/*
        * Ahead of the configured filters, and deliberately not one of them: an author may pin a Kind or
        * a Folder into a Widget, never a Space. Which Space a viewer reads is theirs to choose, and only
        * where the Area allows it at all.
        */}
      {spaceSelectionAllowed && spaceOptions.length > 1 ? (
        <PhiSelectControl
          value={activeSpaceAddress ?? undefined}
          options={spaceOptions}
          placeholder={labels.space.label}
          size={controlSize}
          style={{ minWidth: 140 }}
          onChange={(value) => {
            if (typeof value !== "string" || !value) return;
            setQuery((current) => ({
              ...current,
              page: 1,
              // Folders belong to the Space they were listed from.
              filters: { ...current.filters, spaceId: value, folderId: null },
            }));
          }}
        />
      ) : null}
      {(features.filters ?? []).map((filter) => {
        const style = {
          width: normalizePhiCssSize(filter.width) ?? undefined,
          minWidth: normalizePhiCssSize(filter.minWidth) ?? undefined,
        };
        if (filter.key === "kind" && filter.control === "multi-select") {
          return (
            <PhiMultiSelectControl<PhiMediaKindValue>
              key={filter.key}
              value={state.kinds}
              placeholder={filter.placeholder ?? labels.tool.kindLabel}
              options={[
                { value: PhiMediaKind.Image, label: labels.tool.imageKindLabel },
                { value: PhiMediaKind.Video, label: labels.tool.videoKindLabel },
                { value: PhiMediaKind.Audio, label: labels.tool.audioKindLabel },
                { value: PhiMediaKind.Pdf, label: labels.tool.pdfKindLabel },
                { value: PhiMediaKind.Markdown, label: labels.tool.markdownKindLabel },
                { value: PhiMediaKind.Document, label: labels.tool.documentKindLabel },
                { value: PhiMediaKind.Archive, label: labels.tool.archiveKindLabel },
                { value: PhiMediaKind.Binary, label: labels.tool.binaryKindLabel },
                { value: PhiMediaKind.Other, label: labels.tool.otherKindLabel },
              ]}
              allowClear
              maxTagCount={1}
              size={controlSize}
              style={{ ...style, minWidth: style.minWidth ?? 112 }}
              onChange={(value) => binding.setQuery((current) => ({
                ...current,
                page: 1,
                filters: { ...current.filters, kind: readAssetKinds(value) },
              }))}
            />
          );
        }
        if (filter.key === "presentationFlags" && filter.control === "multi-select") {
          return (
            <PhiMultiSelectControl<number>
              key={filter.key}
              value={readAssetFlagValues(state.presentationFlags)}
              placeholder={filter.placeholder ?? labels.tool.flagPlaceholder}
              options={[
                { value: PhiMediaAssetFlags.Featured, label: labels.editor.featuredFlagLabel },
                { value: PhiMediaAssetFlags.Locked, label: labels.editor.lockedFlagLabel },
                { value: PhiMediaAssetFlags.Mask, label: labels.editor.maskFlagLabel },
              ]}
              allowClear
              maxTagCount={1}
              size={controlSize}
              style={{ ...style, minWidth: style.minWidth ?? 128 }}
              onChange={(value) => binding.setQuery((current) => ({
                ...current,
                page: 1,
                filters: {
                  ...current.filters,
                  presentationFlags: value.length > 0 ? combinePhiMediaFlagValues(value) : null,
                },
              }))}
            />
          );
        }
        if (filter.key === "folderId" && filter.control === "cascader") {
          const createAction = filter.actions?.find((action) => action.key === "createFolder");
          return (
            <PhiAssetFolderControl
              key={filter.key}
              value={folderValue}
              options={folderOptions}
              placeholder={filter.placeholder ?? labels.tool.folderLabel}
              allowClear
              showCreate={Boolean(createAction)}
              createLabel={createAction?.label ?? labels.tool.createFolderLabel}
              size={controlSize}
              style={{ ...style, minWidth: style.minWidth ?? 140 }}
              onCreate={() => actionSignals.emitCapability("actionActivate", {
                actionKey: "createFolder",
                query,
              })}
              onChange={(value) => binding.setQuery((current) => ({
                ...current,
                page: 1,
                filters: {
                  ...current.filters,
                  folderId: resolvePhiMediaFolderIdFromValue(state.folders, value),
                },
              }))}
            />
          );
        }
        return null;
      })}
      {features.search?.enabled ? (
        <PhiTextControl
          inputType="search"
          value={searchDraft}
          placeholder={features.search.placeholder ?? labels.tool.searchPlaceholder}
          ariaLabel={features.search.placeholder ?? labels.tool.searchPlaceholder}
          size={controlSize}
          style={{ flex: "1 1 12rem", minWidth: normalizePhiCssSize(features.search.minWidth) ?? "10rem" }}
          onChange={(value) => setSearchDraft(value ?? "")}
        />
      ) : null}
    </>
  ) : null;

  const toolbar = selfContained && (
    (features.actions?.toolbar?.length ?? 0) > 0 || features.tools.reset || features.tools.reload
  ) ? (
    <PhiToolbarControl compact size={controlSize}>
      {(features.actions?.toolbar ?? []).map((action) => {
        const display = action.display ?? "icon";
        const label = action.label ?? (action.key === "upload" ? labels.tool.uploadToggleLabel : action.key);
        return (
          <PhiButtonControl
            key={action.key}
            label={display === "icon" ? undefined : label}
            ariaLabel={label}
            tooltip={action.description}
            icon={display === "label" || !action.icon ? undefined : resolvePhiButtonIcon(action.icon)}
            type={action.mode === "primary" ? "primary" : "default"}
            danger={action.mode === "danger"}
            size={controlSize}
            onClick={action.key === "upload" ? () => binding.setOpenPanelKey(
              state.uploadPanelOpen ? null : "upload",
            ) : undefined}
          />
        );
      })}
      {features.tools.reset ? (
        <PhiButtonControl
          ariaLabel={labels.tool.resetLabel}
          tooltip={labels.tool.resetLabel}
          icon={resolvePhiButtonIcon("undo")}
          size={controlSize}
          onClick={() => binding.setQuery({
            ...(config.initialQuery ?? {}),
            page: config.initialQuery?.page ?? 1,
            pageSize: config.initialQuery?.pageSize ?? features.pagination?.pageSize ?? 20,
            filters: { ...(config.initialQuery?.filters ?? {}) },
          })}
        />
      ) : null}
      {features.tools.reload ? (
        <PhiButtonControl
          ariaLabel={labels.tool.reloadLabel}
          tooltip={labels.tool.reloadLabel}
          icon={resolvePhiButtonIcon("reload")}
          size={controlSize}
          onClick={binding.reload}
        />
      ) : null}
    </PhiToolbarControl>
  ) : null;

  const awaitingInitialPayload = binding.data == null && !state.error;
  const body = state.error ? null : awaitingInitialPayload ? (
    <PhiMediaAssetCollectionSkeletonControl mode={mode} gap={gap} minColumnWidth={minColumnWidth} />
  ) : state.assets.length === 0 ? (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={presentation.emptyDescription ?? labels.grid.emptyDescription} />
  ) : undefined;

  return (
    <PhiCollectionViewControl
      title={presentation.title}
      description={presentation.description}
      filters={filters}
      toolbar={toolbar}
      panel={state.uploadPanelOpen ? (
        <PhiAreaUploadBinding
          labels={labels.upload}
          onUploadComplete={binding.reload}
          collectionContext={{
            folders: state.folders,
            folderId: state.folderId,
            folderPath: null,
            presentationFlags: state.presentationFlags,
            query,
          }}
        />
      ) : null}
      diagnostics={state.error ? <PhiAlertControl level="error" showIcon title={state.error} /> : null}
      body={body}
      items={state.assets.map((asset) => (
        <PhiMediaAssetTileControl
          key={asset.id}
          asset={asset}
          minColumnWidth={minColumnWidth}
          selected={state.selectedAssetId === asset.id}
          mode={mode}
          onSelect={selectAsset}
          onDelete={(nextAsset) => { void deleteAsset(nextAsset); }}
          deleteLabel={labels.grid.deleteLabel}
          showTypeLabel
          showDeleteAction
          showDimensions
          showIdLabel
        />
      ))}
      mode={mode}
      gap={gap}
      minColumnWidth={minColumnWidth}
      pagination={features.pagination?.enabled === false ? null : {
        page: state.page,
        pageSize: state.pageSize,
        total: state.pagination?.total ?? state.assets.length,
        simple: features.pagination?.simple,
        showSizeChanger: features.pagination?.showSizeChanger,
        size: controlSize,
        onChange: (page, pageSize) => {
          binding.setQuery((current) => ({ ...current, page, pageSize }));
        },
      }}
    />
  );
}
