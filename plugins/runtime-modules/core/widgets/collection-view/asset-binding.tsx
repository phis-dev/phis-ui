"use client";

import { isPhiRecord } from "../../../../../helpers/is-record";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PhiMediaAssetFlags, PhiMediaKind } from "../../../../../constants/media";
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../../constants/media-library-provider-keys";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type {
  PhiCollectionProviderResourceDescriptor,
  PhiCollectionViewBindingModel,
} from "../../../../../types/collection-provider";
import type { PhiMediaCollectionItem, PhiMediaKindValue } from "../../../../../types/media";
import { createPhiSignalSubcontrolAddress } from "../../../../../types/signals";
import { normalizePhiCssSize } from "../../../../../components/layouts/phi-layout-contract";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiCollectionViewControl } from "../../../../../components/controls/phi-collection-view-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";
import { PhiMultiSelectControl } from "../../../../../components/controls/phi-multi-select-control";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { PhiTextControl } from "../../../../../components/controls/phi-text-control";
import { PhiToolbarControl } from "../../../../../components/controls/phi-toolbar-control";
import {
  PhiMediaAssetCollectionSkeletonControl,
  PhiMediaAssetTileControl,
} from "../../../../../components/controls/phi-media-asset-tile-control";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import { usePhiApplicationFeedback } from "../../../../../components/runtime/use-phi-application-feedback";
import type { PhiCmsCollectionViewWidgetConfig } from "../../../../../types/collection-view-widget";
import { resolvePhiButtonIcon } from "../../../../../components/widgets/client/shared/phi-button-icons";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiSearchDraft } from "../../../../../components/widgets/client/shared/phi-search-draft";
import {
  buildPhiMediaSpaceOptions,
  usePhiMediaSpaceSelectionAllowed,
} from "../../../../../components/media/media-space-selection";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderValueById,
  combinePhiMediaFlagValues,
  resolvePhiMediaFolderIdFromValue,
} from "../../../../../components/media/media-folder-options";
import { PhiWidgetFailure } from "../../../../../components/widgets/shared/widget-failure-client";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiRenderableBlockRenderMode } from "../../../../../types/renderable-block";
import { PHI_ASSET_CONTROLLER_STORE_KEY } from "../../../../../components/media/asset-controller-signals";
import { applyPhiAssetCollectionData } from "../../../../../components/media/asset-collection-runtime";
import {
  readPhiMediaAssetTiles,
  readPhiMediaCollectionItems,
  readPhiMediaFolders,
} from "../../../../../components/media/phi-image-preview-data";
import { PhiAssetFolderControl } from "../../../../../components/media/phi-asset-folder-control";
import {
  isPhiMediaFolderIdLocked,
  isPhiMediaFolderLockedError,
} from "../../../../../components/media/media-folder-lock";
import { PhiAreaUploadBinding } from "../../../../../components/media/phi-area-upload-widget";
import { PhiMediaPickerControl } from "../../../../../components/controls/phi-media-picker-control";
import { usePhiMediaPickerBinding } from "../../../../../components/media/phi-media-picker-binding";
import { readPhiMediaUploadFolderPathReach } from "../../../../../components/media/media-upload-flow";
import {
  resolvePhiMediaFolderPathTemplate,
  splitPhiMediaFolderNamePath,
} from "../../../../../components/media/media-folder-name-path";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/search";
import {
  PHI_MEDIA_RENDERER_UPLOAD_PANEL_KEY,
  readPhiMediaRendererResourceActions,
  readPhiMediaRendererToolFailure,
} from "./asset-binding-tools";
import { PHI_MEDIA_WIDGET_DEFAULT_LABELS, type PhiAssetWidgetLabels } from "../../../../../components/media/media-widget-labels";
import { setPhiImagePreviewSelection, usePhiImagePreviewStore } from "../../../../../components/media/phi-image-preview-store";

const ASSET_FLAG_VALUES = [
  PhiMediaAssetFlags.Featured,
  PhiMediaAssetFlags.Locked,
  PhiMediaAssetFlags.Mask,
  PhiMediaAssetFlags.Background,
] as const;

function readAssetFlagValues(presentationFlags: number | null) {
  return presentationFlags == null ? [] : ASSET_FLAG_VALUES.filter((flag) => (presentationFlags & flag) === flag);
}

function readAssetKinds(value: unknown): PhiMediaKindValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is PhiMediaKindValue =>
    typeof entry === "string" && Object.values(PhiMediaKind).includes(entry as PhiMediaKindValue));
}

/*
 * Labels laid over the defaults key by key, through every nested group. A configured set that names only
 * some labels -- `grid.deleteSuccessTemplate` and nothing else -- used to replace the whole set, and the
 * first label it did not name was read as undefined and thrown on.
 */
function overlayPhiAssetLabels<T>(base: T, override: unknown): T {
  if (!isPhiRecord(base) || !isPhiRecord(override)) {
    return (typeof override === typeof base ? override : base) as T;
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && key in base) {
      result[key] = overlayPhiAssetLabels((base as Record<string, unknown>)[key], value);
    }
  }
  return result as T;
}

/**
 * The Media renderer (`PHI_MEDIA_LIBRARY_ITEM_RENDERER_KEY`): the items of a Collection as Media tiles,
 * for whichever Provider names it -- the Media library's own Collection, and any Collection of Assets
 * (a gallery of references) whose resource names it as its `itemRendererKey`, or whose placement does.
 *
 * - **Items** are read in the Media tile shape (`PhiMediaCollectionItem`, `readPhiMediaCollectionItems`);
 *   the Media library's own as its whole tiles.
 * - **Tools** follow what the resource declares (`readPhiMediaRendererToolFailure`): a Folder, lock,
 *   new-Folder or flag tool the placement names but the resource does not declare is a failure, not a
 *   control that does nothing. A tile's delete is the resource's `delete`, in the words the placement's
 *   `presentation.labels.grid` gives (a gallery's "Remove from gallery").
 * - **Upload** is the resource's `upload` panel, the Media library's multi-upload wall, into
 *   `features.media.folderPath` with `{param}` filled from the binding params. Where the resource
 *   declares `add`, what arrived is added to it (`itemKeys`, the Asset ids) -- the Provider's answer shows
 *   it at once, then the Collection is read again -- and leaves the wall, so it is not shown twice.
 * - **Choose from Media library** (toolbar action `add`) opens the library's picker on the same Folder;
 *   the pick goes to the same `add` action.
 * - **The Asset Controller's store** (the selection, the Space selector) is fed by the Media library's
 *   own Collection only; a tile of another Collection is not selected.
 *
 * Drag reordering (`features.reorder`) is the Collection View's, around these tiles.
 */
export function PhiAssetCollectionViewBinding({
  config,
  binding,
  labels: rawLabels,
  widgetId,
  renderMode,
  resource,
}: {
  config: PhiCmsCollectionViewWidgetConfig;
  binding: PhiCollectionViewBindingModel;
  labels?: unknown;
  widgetId?: PhiCmsInstanceId | null;
  /** Handed on by the Collection View, so a configuration this renderer cannot serve is said its way. */
  renderMode: PhiRenderableBlockRenderMode;
  /** The bound resource as the Area declares it (the Collection View's Server half read it); `null`: none. */
  resource?: PhiCollectionProviderResourceDescriptor | null;
}) {
  /*
   * The English defaults, under what the server half loaded for this Widget (`rawLabels`, the Media Label
   * Set in the reader's language), under what the Widget's own configuration says.
   */
  const labels = useMemo(
    () => overlayPhiAssetLabels<PhiAssetWidgetLabels>(
      overlayPhiAssetLabels<PhiAssetWidgetLabels>(PHI_MEDIA_WIDGET_DEFAULT_LABELS, rawLabels),
      config.presentation.labels,
    ),
    [config.presentation.labels, rawLabels],
  );
  const { token } = usePhiConfig();
  const { showMessage } = usePhiApplicationFeedback();
  // The Media library's own Collection, the one whose answer is the Asset Controller's store.
  const isMediaLibrary = config.source?.providerKey === PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection;
  const resourceActions = readPhiMediaRendererResourceActions(resource);
  const toolFailure = readPhiMediaRendererToolFailure({ config, resource });
  const storeState = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const query = binding.query;
  const setQuery = binding.setQuery;
  const sourceName = `The collection "${config.source?.resourceKey ?? "unknown"}"`;
  // A Collection carries items of no particular type; they are read as tiles, not cast to them.
  const mediaTiles = useMemo(
    () => isMediaLibrary ? readPhiMediaAssetTiles(binding.data?.items ?? []) : null,
    [binding.data?.items, isMediaLibrary],
  );
  const assets = useMemo<readonly PhiMediaCollectionItem[]>(
    () => mediaTiles ?? readPhiMediaCollectionItems(binding.data?.items ?? [], sourceName),
    [binding.data?.items, mediaTiles, sourceName],
  );
  const folders = useMemo(() => readPhiMediaFolders(binding.data?.meta?.folders), [binding.data?.meta?.folders]);
  const queryKind = query.filters?.kind;
  const queryFlags = query.filters?.presentationFlags;
  const queryFolderId = query.filters?.folderId;
  const state = {
    selectedAssetId: isMediaLibrary ? storeState.selectedAssetId : null,
    selectedVariantKey: storeState.selectedVariantKey,
    searchQuery: query.search ?? "",
    folderId: typeof queryFolderId === "number" ? queryFolderId : null,
    kinds: readAssetKinds(queryKind),
    presentationFlags: typeof queryFlags === "number" ? queryFlags : null,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    assets,
    folders,
    // Nothing read yet is nothing counted yet; the assets of a page are never the count.
    pagination: { total: binding.data?.total ?? 0 },
    loading: binding.loading,
    error: binding.error,
    uploadPanelOpen: binding.openPanelKey === PHI_MEDIA_RENDERER_UPLOAD_PANEL_KEY,
  };
  useEffect(() => {
    if (isMediaLibrary && binding.data) {
      applyPhiAssetCollectionData(binding.data);
    }
  }, [binding.data, isMediaLibrary]);
  const onSearchChange = useCallback(
    (search: string) => setQuery((current) => ({ ...current, page: 1, search })),
    [setQuery],
  );
  const { draft: searchDraft, setDraft: setSearchDraft } = usePhiSearchDraft({
    query: state.searchQuery,
    onQueryChange: onSearchChange,
    debounceMs: 150,
  });
  /*
   * Which tiles are being deleted right now, by asset.
   *
   * A list rather than one id: the grid offers a delete on every tile at once, and an id that could only
   * hold the last press would move the indicator off the tile that is actually waiting. The entry is
   * dropped in a `finally`, so a refusal clears it as surely as a success does.
   */
  const [deletingAssetIds, setDeletingAssetIds] = useState<readonly number[]>([]);
  const [folderLockPending, setFolderLockPending] = useState(false);
  const spaceSelectionAllowed = usePhiMediaSpaceSelectionAllowed();
  const activeSpaceAddress = typeof query.filters?.spaceId === "string" && query.filters.spaceId
    ? query.filters.spaceId
    : storeState.activeSpace?.address ?? null;
  // The Spaces are the Media library's to answer; another Collection's items are of the Site Space.
  const spaceOptions = useMemo(
    () => buildPhiMediaSpaceOptions(isMediaLibrary ? storeState.spaces : [], labels.space),
    [isMediaLibrary, labels.space, storeState.spaces],
  );
  const presentation = config.presentation;
  const features = config.features;
  const controlSize = presentation.controlSize ?? "small";
  const mode = presentation.mode;
  const gap = normalizePhiCssSize(presentation.gap) ?? token.paddingSM;
  const minColumnWidth = normalizePhiCssSize(presentation.minColumnWidth) ?? 102;
  const selfContained = features.tools.mode === "self-contained";
  /*
   * Where an upload goes and the picker opens (`features.media.folderPath`), its `{param}` names filled
   * from the binding params the Provider is asked with -- what a Controller told this Collection about the
   * record it shows. Resolved per render, so a new set of params moves both.
   */
  const bindingParams = config.source?.params;
  const folderPath = useMemo(
    () => resolvePhiMediaFolderPathTemplate(
      splitPhiMediaFolderNamePath(features.media?.folderPath),
      isPhiRecord(bindingParams) ? bindingParams : {},
    ),
    [bindingParams, features.media?.folderPath],
  );
  const mediaType = features.media?.mediaType ?? null;
  const uploadAcceptance = useMemo(() => mediaType ? { kinds: [mediaType] } : undefined, [mediaType]);
  const folderOptions = useMemo(
    () => buildPhiMediaFolderCascaderOptions(state.folders, { lockedLabel: labels.tool.folderLockedLabel }),
    [labels.tool.folderLockedLabel, state.folders],
  );
  /*
   * The Folder the listing is filtered to, locked: Core refuses a new Folder in it, an upload into it and
   * a delete from it, so none of the three is offered while it is chosen. An Asset's own delete reads its
   * own Folder, because a listing without a Folder filter shows Assets from many.
   */
  const currentFolder = state.folderId == null ? null : state.folders.find((folder) => folder.id === state.folderId) ?? null;
  const currentFolderLocked = isPhiMediaFolderIdLocked(state.folders, state.folderId);
  const folderValue = useMemo(() => buildPhiMediaFolderValueById(state.folders, state.folderId), [state.folderId, state.folders]);
  const selectionSignals = usePhiControlSignalController<Record<string, unknown>>({
    key: "assetSelection",
    sender: widgetId == null ? null : createPhiSignalSubcontrolAddress("cms", widgetId, "selection"),
    signalRoutes: config.signalRoutes,
    valueType: "json",
    typeKey: "collection-view",
    coerceValue: (nextValue) => isPhiRecord(nextValue)
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

  /*
   * Adds Assets of the Media library to the bound resource (its `add` action, `itemKeys` the Asset ids):
   * what an upload made, or what was picked. The Provider answers the Collection as it now stands, which
   * the binding shows at once; then it is read again.
   */
  const addAssets = useCallback(async (assetIds: readonly number[]) => {
    try {
      const data = await binding.activate({ actionKey: "add", itemKeys: [...assetIds], query });
      if (data.error) throw new Error(data.error);
      binding.reload();
    } catch (error) {
      showMessage({
        level: "error",
        content: error instanceof Error && error.message ? error.message : labels.grid.addFailedText,
        durationSeconds: 2.8,
      });
    }
  }, [binding, labels.grid.addFailedText, query, showMessage]);

  /*
   * The Media library's picker, for the toolbar action `add`: the Site Space only, opening on the
   * resolved Folder path (read, nothing written), the kind `features.media.mediaType` names (images where
   * none). Every Asset of the Site Space is delivered publicly from the start (`defaultMediaDeliveryPolicy`
   * in phis-server), so there is nothing to grey out; what the resource's `add` takes, it decides. A pick
   * is added; the picker has no upload of its own here -- the Collection's upload panel is that.
   */
  const pickerOpenOnFolder = useCallback(
    (signal: AbortSignal) => readPhiMediaUploadFolderPathReach(folderPath, signal),
    [folderPath],
  );
  const libraryPicker = usePhiMediaPickerBinding({
    config: {
      mediaType: mediaType ?? PhiMediaKind.Image,
      pageSize: 12,
      showPagination: true,
      showSearchBar: true,
    },
    labels,
    searchLabels: PHI_SEARCH_WIDGET_DEFAULT_LABELS,
    value: null,
    siteSpaceOnly: true,
    onAssetSelect: (picked) => { void addAssets([picked.id]); },
    openOnFolder: folderPath.length > 0 ? pickerOpenOnFolder : null,
  });

  if (toolFailure) {
    return (
      <PhiWidgetFailure
        renderMode={renderMode}
        widgetType={PhiCmsWidgetType.CollectionView}
        widgetId={widgetId}
        title={toolFailure}
      />
    );
  }

  function readActionFailure(error: unknown, fallback: string) {
    if (isPhiMediaFolderLockedError(error)) return labels.tool.folderLockedText;
    return error instanceof Error ? error.message : fallback;
  }

  async function toggleFolderLock() {
    if (!currentFolder || folderLockPending) return;
    setFolderLockPending(true);
    try {
      const data = await binding.activate({
        actionKey: currentFolderLocked ? "unlockFolder" : "lockFolder",
        itemKey: currentFolder.id,
        item: { flags: currentFolder.flags },
        query,
      });
      if (data.error) throw new Error(data.error);
    } catch (error) {
      showMessage({
        level: "error",
        content: isPhiMediaFolderLockedError(error) ? labels.tool.folderLockedText : labels.tool.folderLockFailedText,
        durationSeconds: 2.8,
      });
    } finally {
      setFolderLockPending(false);
    }
  }

  async function deleteAsset(asset: PhiMediaCollectionItem) {
    setDeletingAssetIds((current) => current.includes(asset.id) ? current : [...current, asset.id]);
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
        content: readActionFailure(error, labels.grid.deleteFailedText),
        durationSeconds: 2.8,
      });
    } finally {
      setDeletingAssetIds((current) => current.filter((id) => id !== asset.id));
    }
  }

  // The Media library's own tiles only: a selection is the Asset Controller's, which reads that library.
  function selectAsset(asset: PhiMediaCollectionItem) {
    const tile = mediaTiles?.find((entry) => entry.id === asset.id);
    if (!tile) return;
    setPhiImagePreviewSelection(PHI_ASSET_CONTROLLER_STORE_KEY, tile.id, state.selectedVariantKey ?? null, tile);
    selectionSignals.emitCapability("selection", { area: PHI_ASSET_CONTROLLER_STORE_KEY, assetId: tile.id });
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
                { value: PhiMediaKind.Font, label: labels.tool.fontKindLabel },
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
                { value: PhiMediaAssetFlags.Featured, label: labels.tool.featuredFlagLabel },
                { value: PhiMediaAssetFlags.Locked, label: labels.tool.lockedFlagLabel },
                { value: PhiMediaAssetFlags.Mask, label: labels.tool.maskFlagLabel },
                { value: PhiMediaAssetFlags.Background, label: labels.tool.backgroundFlagLabel },
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
          const lockAction = filter.actions?.find((action) => action.key === "lockFolder");
          return (
            <PhiAssetFolderControl
              key={filter.key}
              value={folderValue}
              options={folderOptions}
              placeholder={filter.placeholder ?? labels.tool.folderLabel}
              allowClear
              showCreate={Boolean(createAction)}
              createLabel={createAction?.label ?? labels.tool.createFolderLabel}
              createDisabled={currentFolderLocked}
              lock={lockAction && currentFolder ? {
                locked: currentFolderLocked,
                lockLabel: labels.tool.lockFolderLabel,
                unlockLabel: labels.tool.unlockFolderLabel,
                pending: folderLockPending,
                onToggle: () => { void toggleFolderLock(); },
              } : null}
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
        const label = action.label ?? (
          action.key === "upload" ? labels.upload.uploadToggleLabel
            : action.key === "add" ? labels.tool.chooseFromLibraryLabel
              : action.key
        );
        const button = (
          <PhiButtonControl
            key={action.key}
            label={display === "icon" ? undefined : label}
            ariaLabel={label}
            tooltip={action.description}
            icon={display === "label" || !action.icon ? undefined : resolvePhiButtonIcon(action.icon)}
            type={action.mode === "primary" ? "primary" : "default"}
            danger={action.mode === "danger"}
            size={controlSize}
            disabled={action.key === "upload" && currentFolderLocked}
            onClick={action.key === "upload" ? () => binding.setOpenPanelKey(
              state.uploadPanelOpen ? null : PHI_MEDIA_RENDERER_UPLOAD_PANEL_KEY,
            ) : undefined}
          />
        );
        // The picker opens from its own button: the popover's trigger.
        return action.key === "add"
          ? <PhiMediaPickerControl key={action.key} {...libraryPicker} trigger={<span>{button}</span>} />
          : button;
      })}
      {features.tools.reset ? (
        <PhiButtonControl
          ariaLabel={labels.tool.resetLabel}
          tooltip={labels.tool.resetLabel}
          icon={resolvePhiButtonIcon("antd:rollback-outlined")}
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
    <PhiEmptyControl description={presentation.emptyDescription ?? labels.grid.emptyDescription} />
  ) : undefined;

  /*
   * The upload panel: the Media library's wall, into the resolved Folder path where the placement names
   * one. For the Media library's own Collection what arrived stays in the wall, with its delete, and the
   * listing is read again; for a resource that adds, what arrived is added and leaves the wall; for any
   * other the Collection is read again, in case its Provider lists what arrived itself.
   */
  const uploadPanel = state.uploadPanelOpen ? (
    <PhiAreaUploadBinding
      labels={labels.upload}
      config={folderPath.length > 0 ? { folderPath: folderPath.join(" / ") } : null}
      acceptance={uploadAcceptance}
      showFinished={isMediaLibrary}
      siteSpaceOnly={!isMediaLibrary}
      onUploadComplete={resourceActions.add ? undefined : binding.reload}
      onAssetUploaded={resourceActions.add ? (asset) => { void addAssets([asset.id]); } : undefined}
      collectionContext={isMediaLibrary ? {
        folders: state.folders,
        folderId: state.folderId,
        folderPath: null,
        presentationFlags: state.presentationFlags,
        query,
      } : {
        folders: [],
        folderId: null,
        folderPath: null,
        presentationFlags: null,
        query,
      }}
    />
  ) : null;

  return (
    <PhiCollectionViewControl
      title={presentation.title}
      description={presentation.description}
      filters={filters}
      toolbar={toolbar}
      panel={uploadPanel}
      /*
       * Only what an action left behind reaches this: a failed read of the source ends the Collection
       * View before this renderer is drawn. A refusal is the acting person's to read, live or not.
       */
      diagnostics={state.error ? (
        <PhiAlertControl level="error" showIcon title={state.error} />
      ) : currentFolderLocked ? (
        // Said where the contents are, so the missing upload and delete are not a riddle.
        <PhiAlertControl level="info" showIcon title={labels.tool.folderLockedText} />
      ) : null}
      body={body}
      items={state.assets.map((asset) => (
        <PhiMediaAssetTileControl<PhiMediaCollectionItem>
          key={asset.id}
          asset={asset}
          minColumnWidth={minColumnWidth}
          selected={state.selectedAssetId === asset.id}
          mode={mode}
          deleting={deletingAssetIds.includes(asset.id)}
          {...(isMediaLibrary ? { onSelect: selectAsset } : {})}
          onDelete={(nextAsset) => { void deleteAsset(nextAsset); }}
          deleteLabel={labels.grid.deleteLabel}
          showTypeLabel
          showDeleteAction={resourceActions.delete && !isPhiMediaFolderIdLocked(state.folders, asset.folderId)}
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
        total: state.pagination?.total ?? 0,
        simple: features.pagination?.compact,
        showSizeChanger: (features.pagination?.pageSizes?.length ?? 0) > 0,
        pageSizeOptions: features.pagination?.pageSizes,
        size: controlSize,
        onChange: (page, pageSize) => {
          binding.setQuery((current) => ({ ...current, page, pageSize }));
        },
      }}
    />
  );
}
