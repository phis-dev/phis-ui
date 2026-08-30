"use client";

import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";

import { PhiImageAssetVariantKey, PhiMediaKind } from "../../constants/media";
import type { PhiCollectionProviderQuery } from "../../types/collection-provider";
import type { PhiMediaAssetFolder, PhiMediaAssetTile, PhiMediaSpaceOption } from "../../types/media";
import type { PhiCmsMediaPickerWidgetConfig } from "../../plugins/runtime-modules/asset/widgets/media-picker/config";
import type { PhiSearchWidgetLabels } from "../widgets/label-types/search";
import { usePhiControlSignalController } from "../widgets/client/shared/phi-control-signals";
import { usePhiCollectionProvider } from "../widgets/client/shared/phi-collection-provider";
import { PhiMediaPickerControl } from "../controls/phi-media-picker-control";
import { normalizePhiMediaPickerMinColumnWidth } from "../controls/phi-media-picker-control-contract";
import type { PhiAssetWidgetLabels } from "./media-widget-labels";
import { PHI_ASSET_COLLECTION_DATA_SOURCE } from "./asset-collection-runtime";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderValueById,
  PHI_ASSET_CONTROLLER_STORE_KEY,
  PHI_ASSET_SIGNAL_CHANNELS,
  resolvePhiMediaFolderIdFromValue,
} from "./phi-media-scope-controller";
import { setPhiImagePreviewSelection } from "./phi-image-preview-store";
import {
  buildPhiMediaSpaceOptions,
  usePhiMediaSpaceSelectionAllowed,
} from "./media-space-selection";

export type PhiMediaPickerBindingProps = {
  config?: PhiCmsMediaPickerWidgetConfig | null;
  labels: PhiAssetWidgetLabels;
  searchLabels: PhiSearchWidgetLabels;
  value?: number | null;
  onAssetSelect?: (asset: PhiMediaAssetTile) => void;
  onAssetClear?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCommit?: (assetId: number | null, originalAssetId: number | null) => void;
  onDiscard?: (originalAssetId: number | null) => void;
  onPopupOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement;
  popupRootClassName?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function usePhiMediaPickerBinding({
  config,
  labels,
  searchLabels,
  value: controlledValue,
  onAssetSelect,
  onAssetClear,
  open: controlledOpen,
  onOpenChange,
  onCommit,
  onDiscard,
  onPopupOpenChange,
  trigger,
  getPopupContainer,
  popupRootClassName,
}: PhiMediaPickerBindingProps) {
  const [localOpen, setLocalOpen] = useState(false);
  const [localValue, setLocalValue] = useState<number | null>(controlledValue ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(config?.pageSize ?? 20);
  const [minColumnWidth, setMinColumnWidth] = useState(() =>
    normalizePhiMediaPickerMinColumnWidth(config?.minColumnWidth),
  );
  const [refreshToken, setRefreshToken] = useState(0);
  const [assets, setAssets] = useState<PhiMediaAssetTile[]>([]);
  const [folders, setFolders] = useState<PhiMediaAssetFolder[]>([]);
  const [spaces, setSpaces] = useState<PhiMediaSpaceOption[]>([]);
  // Null asks for no particular Space, which the control plane answers with the Site Space. An
  // authoring surface never leaves this state, because it never renders the selector.
  const [spaceAddress, setSpaceAddress] = useState<string | null>(null);
  const spaceSelectionAllowed = usePhiMediaSpaceSelectionAllowed();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const assetCacheRef = useRef(new Map<number, PhiMediaAssetTile>());
  const isOpen = controlledOpen ?? localOpen;
  const selectedAssetId = controlledValue ?? localValue;
  const mediaType = config?.mediaType ?? PhiMediaKind.Image;
  const presentationFlags = typeof config?.presentationFlags === "number" && Number.isInteger(config.presentationFlags)
    ? config.presentationFlags
    : null;
  const source = config?.dataSource ?? PHI_ASSET_COLLECTION_DATA_SOURCE;
  const { provider, bindingError } = usePhiCollectionProvider(source);
  const folderOptions = useMemo(() => buildPhiMediaFolderCascaderOptions(folders), [folders]);
  const spaceOptions = useMemo(
    () => buildPhiMediaSpaceOptions(spaces, labels.space),
    [labels.space, spaces],
  );
  const folderValue = useMemo(() => buildPhiMediaFolderValueById(folders, folderId), [folderId, folders]);
  const query = useMemo<PhiCollectionProviderQuery>(() => ({
    page,
    pageSize,
    search: searchQuery,
    sortKey: "created_at",
    sortOrder: "descend",
    filters: {
      folderId,
      kind: mediaType,
      presentationFlags,
      ...(spaceSelectionAllowed && spaceAddress ? { spaceId: spaceAddress } : {}),
    },
  }), [presentationFlags, folderId, mediaType, page, pageSize, searchQuery, spaceAddress, spaceSelectionAllowed]);

  const querySignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.query, signalRoutes: config?.signalRoutes, valueType: "string", typeKey: "media-picker-query", clearValue: "", onSetValue: (next) => { setSearchQuery(next); setPage(1); }, coerceValue: (next) => typeof next === "string" ? next : null });
  const pathSignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.path, signalRoutes: config?.signalRoutes, valueType: "path", typeKey: "media-picker-path", clearValue: "/", onSetValue: (next) => { setFolderId(resolvePhiMediaFolderIdFromValue(folders, next)); setPage(1); }, coerceValue: (next) => typeof next === "string" ? next : null });
  const reloadSignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.reload, signalRoutes: config?.signalRoutes, typeKey: "media-picker-reload", onReceiveCapability: (capabilityId) => { if (capabilityId !== "reload") return false; setRefreshToken((current) => current + 1); return true; } });
  const kindSignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.kind, signalRoutes: config?.signalRoutes, valueType: "string", typeKey: "media-picker-kind", coerceValue: (next) => typeof next === "string" ? next : null });
  const flagsSignals = usePhiControlSignalController<number[]>({ key: PHI_ASSET_SIGNAL_CHANNELS.presentationFlags, signalRoutes: config?.signalRoutes, valueType: "number[]", typeKey: "media-picker-presentationFlags", clearValue: [], coerceValue: (next) => Array.isArray(next) && next.every((entry) => typeof entry === "number") ? next : null });
  const paginationSignals = usePhiControlSignalController<Record<string, unknown>>({ key: PHI_ASSET_SIGNAL_CHANNELS.pagination, signalRoutes: config?.signalRoutes, valueType: "json", typeKey: "media-picker-pagination", onSetValue: (next) => { if (typeof next.page === "number" && next.page > 0) setPage(next.page); if (typeof next.pageSize === "number" && next.pageSize > 0) setPageSize(next.pageSize); }, coerceValue: (next) => next && typeof next === "object" && !Array.isArray(next) ? next as Record<string, unknown> : null });
  const selectionSignals = usePhiControlSignalController<Record<string, unknown>>({ key: "assetSelection", signalRoutes: config?.signalRoutes, valueType: "json", typeKey: "media-picker-selection", coerceValue: (next) => next && typeof next === "object" && !Array.isArray(next) ? next as Record<string, unknown> : null });

  useEffect(() => {
    if (!isOpen) return;
    if (!provider || !source) return;
    const abortController = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const data = await provider.query({
          resourceKey: source.resourceKey,
          query,
          params: "params" in source ? source.params : undefined,
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) return;
        const nextFolders = Array.isArray(data.meta?.folders)
          ? data.meta.folders.filter(isRecord) as unknown as PhiMediaAssetFolder[]
          : [];
        const nextAssets = data.items.filter(isRecord) as unknown as PhiMediaAssetTile[];
        setAssets(nextAssets);
        for (const asset of nextAssets) assetCacheRef.current.set(asset.id, asset);
        setFolders(nextFolders);
        setSpaces(Array.isArray(data.meta?.spaces)
          ? data.meta.spaces.filter(isRecord) as unknown as PhiMediaSpaceOption[]
          : []);
        // The answer says which Space it actually served, so the selector follows the control plane
        // rather than the other way round -- including the first load, which asked for nothing.
        const activeAddress = isRecord(data.meta?.activeSpace) && typeof data.meta.activeSpace.address === "string"
          ? data.meta.activeSpace.address
          : null;
        if (activeAddress) setSpaceAddress(activeAddress);
        setTotal(typeof data.total === "number" ? data.total : data.items.length);
      } catch {
        if (!abortController.signal.aborted) {
          setAssets([]);
          setTotal(0);
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => abortController.abort();
  }, [isOpen, provider, query, refreshToken, source]);

  const resolvedAssets = provider && source ? assets : [];

  const updateOpen = (next: boolean) => {
    if (controlledOpen == null) setLocalOpen(next);
    if (next) {
      setRefreshToken((current) => current + 1);
      reloadSignals.emitCapability("reload", null);
      kindSignals.emitCapability("kind", mediaType);
      flagsSignals.emitCapability("presentationFlags", presentationFlags == null ? [] : [presentationFlags]);
    }
    onPopupOpenChange?.(next);
    onOpenChange?.(next);
  };

  const select = (assetId: number | null) => {
    if (controlledValue === undefined) setLocalValue(assetId);
    const asset = assetId == null
      ? null
      : resolvedAssets.find((entry) => entry.id === assetId)
        ?? assetCacheRef.current.get(assetId)
        ?? null;
    if (assetId == null) {
      setPhiImagePreviewSelection(PHI_ASSET_CONTROLLER_STORE_KEY, null, null, null);
      onAssetClear?.();
      return;
    }
    selectionSignals.emitCapability("selection", { area: PHI_ASSET_CONTROLLER_STORE_KEY, assetId, mediaType });
    if (!asset) {
      setPhiImagePreviewSelection(PHI_ASSET_CONTROLLER_STORE_KEY, assetId, null, null);
      return;
    }
    onAssetSelect?.(asset);
    setPhiImagePreviewSelection(PHI_ASSET_CONTROLLER_STORE_KEY, asset.id, asset.kind === PhiMediaKind.Image ? PhiImageAssetVariantKey.Thumbnail : null, asset);
  };

  return {
    open: isOpen,
    value: selectedAssetId,
    assets: resolvedAssets,
    spaces: spaceSelectionAllowed ? spaceOptions : [],
    spaceValue: spaceSelectionAllowed ? spaceAddress : null,
    folders: provider && source ? folderOptions : [],
    folderValue,
    query: searchQuery,
    page,
    pageSize,
    minColumnWidth,
    total: provider && source ? total : 0,
    loading,
    showSearchBar: config?.showSearchBar ?? true,
    showFolderFilter: config?.showFolderFilter ?? true,
    showPagination: config?.showPagination ?? true,
    trigger,
    labels: { trigger: labels.picker.triggerLabel, title: labels.picker.popoverTitle, search: labels.tool.searchPlaceholder ?? searchLabels.placeholder, folder: labels.tool.folderLabel, space: labels.space.label, empty: bindingError ?? labels.picker.emptyDescription, clear: labels.picker.clearLabel, reload: labels.tool.reloadLabel, tileSize: labels.picker.tileSizeLabel },
    getPopupContainer,
    popupRootClassName,
    onOpenChange: updateOpen,
    onCommit,
    onDiscard,
    onQueryChange: (nextQuery: string) => { setSearchQuery(nextQuery); setPage(1); querySignals.emitCapability("query", nextQuery); },
    onSpaceChange: (nextSpace: string) => {
      if (!spaceSelectionAllowed) return;
      // Folders belong to the Space they were listed from, so switching Space starts at its root.
      setSpaceAddress(nextSpace);
      setFolderId(null);
      setPage(1);
    },
    onFolderChange: (nextFolder: string) => { setFolderId(resolvePhiMediaFolderIdFromValue(folders, nextFolder)); setPage(1); pathSignals.emitCapability("path", nextFolder); },
    onPageChange: (nextPage: number, nextPageSize: number) => { setPage(nextPage); setPageSize(nextPageSize); paginationSignals.emitCapability("pagination", { page: nextPage, pageSize: nextPageSize, total }); },
    onMinColumnWidthChange: setMinColumnWidth,
    onReload: () => { setRefreshToken((current) => current + 1); reloadSignals.emitCapability("reload", null); },
    onChange: select,
  } satisfies ComponentProps<typeof PhiMediaPickerControl>;
}

export function PhiMediaPickerBinding(props: PhiMediaPickerBindingProps) {
  const controlProps = usePhiMediaPickerBinding(props);
  return <PhiMediaPickerControl {...controlProps} />;
}
