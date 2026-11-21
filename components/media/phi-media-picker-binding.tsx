"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  PHIS_MEDIA_SOURCE_PAGE_MAX_ITEMS,
  PHIS_MEDIA_SOURCE_QUERY_MAX_LENGTH,
  type PhisMediaSourceItem,
} from "@phis/contracts/media-source";

import { PhiImageAssetVariantKey, PhiMediaKind } from "../../constants/media";
import type { PhiCollectionProviderQuery } from "../../types/collection-provider";
import type { PhiMediaAssetFolder, PhiMediaAssetTile, PhiMediaSpaceOption } from "../../types/media";
import type { PhiCmsMediaPickerWidgetConfig } from "../../types/media";
import type { PhiSearchWidgetLabels } from "../widgets/label-types/search";
import { usePhiControlSignalController } from "../widgets/client/shared/phi-control-signals";
import { usePhiCollectionProvider } from "../widgets/client/shared/phi-collection-provider";
import { usePhiIntlLocale, usePhiIntlTimeZone } from "../root/phi-intl-locale";
import { PhiMediaPickerControl } from "../controls/phi-media-picker-control";
import { normalizePhiMediaPickerMinColumnWidth } from "../controls/phi-media-picker-control-contract";
import type { PhiAssetWidgetLabels } from "./media-widget-labels";
import { PHI_ASSET_COLLECTION_DATA_SOURCE } from "./asset-collection-runtime";
import {
  buildPhiMediaFolderCascaderOptions,
  buildPhiMediaFolderValueById,
  resolvePhiMediaFolderIdFromValue,
} from "./media-folder-options";
import {
  PHI_ASSET_CONTROLLER_STORE_KEY,
  PHI_ASSET_SIGNAL_CHANNELS,
} from "./asset-controller-signals";
import { setPhiImagePreviewSelection } from "./phi-image-preview-store";
import {
  readPhiMediaAssetTiles,
  readPhiMediaFolders,
  readPhiMediaSpace,
  readPhiMediaSpaces,
} from "./phi-image-preview-data";
import {
  buildPhiMediaSpaceOptions,
  usePhiMediaSpaceSelectionAllowed,
} from "./media-space-selection";
import { isPhiRecord } from "../../helpers/is-record";
import {
  readPhiMediaSourceImportErrorMessage,
  usePhiMediaSources,
} from "./phi-media-sources";
import { usePhiCollectionProviderAction } from "../widgets/client/shared/phi-collection-provider";

/**
 * An upload of a file from the reader's machine, offered inside the picker by a host that brings the
 * transport (`usePhiMediaUpload`), so that a picker without one does not carry it.
 *
 * The binding says where the file goes -- the Folder in view -- and chooses what came back; the host
 * sends it, words what went wrong and decides whether the Asset is one to choose (`send` answers null
 * for a refusal, a stopped upload, and an Asset the host does not let be chosen).
 *
 * Offered on the Site Space only, as an import is: the file goes without a Space named, which Core
 * answers with the Site Space, so a picker standing on another Space shows no upload.
 */
export type PhiMediaPickerUploadBinding = {
  /** What the file dialog offers (`usePhiMediaUpload`'s `accept`). */
  accept: string;
  /** How far the upload on its way is, in per cent; null while none is. */
  progress: number | null;
  /** Why the last upload did not work, or the Asset it made cannot be chosen. */
  notice: string | null;
  /**
   * One file into this Folder of the Site Space (null: its root). `intoStartFolder` is true while the
   * picker stands where `openOnFolder` put it and that Folder's path is not all there yet: the host sends
   * the file into the whole path, creating what is missing, as `area-upload` does.
   */
  send: (file: File, folderId: number | null, intoStartFolder: boolean) => Promise<PhiMediaAssetTile | null>;
  /** Stops what is on its way; the picker was closed. */
  cancel: () => void;
};

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
  /**
   * Offers the Site Space and nothing else, wherever the surface stands: no Space selector, and the query
   * names no Space, which the control plane answers with the Site Space. For a place that stores a
   * reference to an Asset for everybody to see, which a personal or a group Space cannot honestly be.
   * An interface rule like `usePhiMediaSpaceSelectionAllowed`; the server that takes the reference is what
   * enforces it.
   */
  siteSpaceOnly?: boolean;
  /**
   * Which of the listed Assets may be chosen; the others stay in the list, greyed out. The list is the
   * control plane's answer and is not narrowed here -- an Asset the question refuses is still one the
   * reader can see exists.
   */
  isAssetSelectable?: (asset: PhiMediaAssetTile) => boolean;
  /** An upload inside the picker, into the Folder it shows (`PhiMediaPickerUploadBinding`). */
  upload?: PhiMediaPickerUploadBinding | null;
  /**
   * The Folder the picker opens on, asked for each time it opens: the listing waits for the answer, and
   * the reader may leave it for another Folder as from any. For a `siteSpaceOnly` host whose setting
   * names a Folder by its path (the `media-asset` field's `folderPath`); the host reads it without
   * writing anything, so a reader who may only choose opens it as well, and answers the deepest Folder of
   * the path that is there (`null`, the root) and whether that is the whole path -- if not, an upload from
   * there goes into the whole path (`PhiMediaPickerUploadBinding.send`). A failed read is said where an
   * upload's refusal would be, and the picker opens on the root.
   */
  openOnFolder?: ((signal: AbortSignal) => Promise<{ folderId: number | null; complete: boolean }>) | null;
};

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
  siteSpaceOnly = false,
  isAssetSelectable,
  upload,
  openOnFolder,
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
  /*
   * The Space the reader chose, which is what the query asks for -- kept apart from the Space the last
   * answer served, which is what the selector shows. Writing the served Space back into the query made
   * the first open ask twice: once for nothing in particular, and once more for the Space it had just
   * been given.
   */
  const [requestedSpaceAddress, setRequestedSpaceAddress] = useState<string | null>(null);
  const spaceSelectionAllowed = usePhiMediaSpaceSelectionAllowed() && !siteSpaceOnly;
  // "" is the Site's library; anything else is the id of a media source (`phi-media-sources.tsx`).
  const [sourceId, setSourceId] = useState("");
  // Tagged with the source that answered, so that another source never shows these for a frame.
  const [sourcePageOf, setSourcePageOf] = useState<{ sourceId: string; items: readonly PhisMediaSourceItem[] }>({ sourceId: "", items: [] });
  const [sourceCursor, setSourceCursor] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceFailed, setSourceFailed] = useState(false);
  const [importingItemId, setImportingItemId] = useState<string | null>(null);
  const [importFailure, setImportFailure] = useState<string | null>(null);
  // True while the Folder the picker opens on is being asked for; the listing waits for it.
  const [startFolderPending, setStartFolderPending] = useState(false);
  const [startFolderFailure, setStartFolderFailure] = useState<string | null>(null);
  // The picker stands where `openOnFolder` put it, and the path it was asked for goes further.
  const [onIncompleteStartFolder, setOnIncompleteStartFolder] = useState(false);
  const startFolderRequestRef = useRef<AbortController | null>(null);
  // The host's upload as of the last render, for the close below, which must not run again per render.
  const uploadRef = useRef(upload);
  useEffect(() => {
    uploadRef.current = upload;
  }, [upload]);
  const sourceRequestRef = useRef<AbortController | null>(null);
  const importRequestRef = useRef<AbortController | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const assetCacheRef = useRef(new Map<number, PhiMediaAssetTile>());
  const isOpen = controlledOpen ?? localOpen;
  const selectedAssetId = controlledValue ?? localValue;
  const mediaType = config?.mediaType ?? PhiMediaKind.Image;
  const presentationFlags = typeof config?.presentationFlags === "number" && Number.isInteger(config.presentationFlags)
    ? config.presentationFlags
    : null;
  const source = config?.dataSource ?? PHI_ASSET_COLLECTION_DATA_SOURCE;
  const { provider, bindingError } = usePhiCollectionProvider(source);
  const updateAsset = usePhiCollectionProviderAction(source);
  const locale = usePhiIntlLocale();
  const timeZone = usePhiIntlTimeZone();
  const folderOptions = useMemo(() => buildPhiMediaFolderCascaderOptions(folders), [folders]);
  const spaceOptions = useMemo(
    () => buildPhiMediaSpaceOptions(spaces, labels.space),
    [labels.space, spaces],
  );
  const folderValue = useMemo(() => buildPhiMediaFolderValueById(folders, folderId), [folderId, folders]);
  /*
   * The sources are asked for when the picker is open and not before. The switch is shown only on the Site
   * Space, because an import always goes to the Site Space: where the surface may name a Space, the one
   * the last answer served decides; a surface that never may (`siteSpaceOnly`, the Builder, the Editor)
   * is on the Site Space by construction. Before the first answer nothing was named, which is the Site Space.
   */
  const mediaSources = usePhiMediaSources({ enabled: isOpen });
  const activeSpaceKind = spaces.find((space) => space.address === spaceAddress)?.kind ?? null;
  const onSiteSpace = !spaceSelectionAllowed || spaceAddress == null || activeSpaceKind === "site";
  const sourceSwitchShown = onSiteSpace && mediaSources.length > 0;
  const activeSource = sourceSwitchShown ? mediaSources.find((entry) => entry.id === sourceId) ?? null : null;
  const sourceOptions = useMemo(
    () => sourceSwitchShown
      ? [{ value: "", label: labels.space.site }, ...mediaSources.map((entry) => ({ value: entry.id, label: entry.label }))]
      : [],
    [labels.space.site, mediaSources, sourceSwitchShown],
  );
  const sourceQuery = searchQuery.trim().slice(0, PHIS_MEDIA_SOURCE_QUERY_MAX_LENGTH);
  const sourcePageSize = Math.min(Math.max(pageSize, 1), PHIS_MEDIA_SOURCE_PAGE_MAX_ITEMS);
  const query = useMemo<PhiCollectionProviderQuery>(() => ({
    page,
    pageSize,
    search: searchQuery,
    sortKey: "created_at",
    sortOrder: "descending",
    filters: {
      folderId,
      kind: mediaType,
      presentationFlags,
      ...(spaceSelectionAllowed && requestedSpaceAddress ? { spaceId: requestedSpaceAddress } : {}),
    },
  }), [presentationFlags, folderId, mediaType, page, pageSize, requestedSpaceAddress, searchQuery, spaceSelectionAllowed]);

  const querySignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.query, signalRoutes: config?.signalRoutes, valueType: "string", typeKey: "media-picker-query", clearValue: "", onSetValue: (next) => { setSearchQuery(next); setPage(1); }, coerceValue: (next) => typeof next === "string" ? next : null });
  const pathSignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.path, signalRoutes: config?.signalRoutes, valueType: "path", typeKey: "media-picker-path", clearValue: "/", onSetValue: (next) => { setFolderId(resolvePhiMediaFolderIdFromValue(folders, next)); setOnIncompleteStartFolder(false); setPage(1); }, coerceValue: (next) => typeof next === "string" ? next : null });
  const reloadSignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.reload, signalRoutes: config?.signalRoutes, typeKey: "media-picker-reload", onReceiveCapability: (capabilityId) => { if (capabilityId !== "reload") return false; setRefreshToken((current) => current + 1); return true; } });
  const kindSignals = usePhiControlSignalController<string>({ key: PHI_ASSET_SIGNAL_CHANNELS.kind, signalRoutes: config?.signalRoutes, valueType: "string", typeKey: "media-picker-kind", coerceValue: (next) => typeof next === "string" ? next : null });
  const flagsSignals = usePhiControlSignalController<number[]>({ key: PHI_ASSET_SIGNAL_CHANNELS.presentationFlags, signalRoutes: config?.signalRoutes, valueType: "number[]", typeKey: "media-picker-presentationFlags", clearValue: [], coerceValue: (next) => Array.isArray(next) && next.every((entry) => typeof entry === "number") ? next : null });
  const paginationSignals = usePhiControlSignalController<Record<string, unknown>>({ key: PHI_ASSET_SIGNAL_CHANNELS.pagination, signalRoutes: config?.signalRoutes, valueType: "json", typeKey: "media-picker-pagination", onSetValue: (next) => { if (typeof next.page === "number" && next.page > 0) setPage(next.page); if (typeof next.pageSize === "number" && next.pageSize > 0) setPageSize(next.pageSize); }, coerceValue: (next) => isPhiRecord(next) ? next as Record<string, unknown> : null });
  const selectionSignals = usePhiControlSignalController<Record<string, unknown>>({ key: "assetSelection", signalRoutes: config?.signalRoutes, valueType: "json", typeKey: "media-picker-selection", coerceValue: (next) => isPhiRecord(next) ? next as Record<string, unknown> : null });

  useEffect(() => {
    if (!isOpen) return;
    if (!provider || !source) return;
    // The source's items stand where the library's tiles do; the library is read again when it comes back.
    if (activeSource) return;
    // The Folder it opens on is not known yet; reading the root first would ask twice.
    if (startFolderPending) return;
    const abortController = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadFailed(false);
      try {
        const data = await provider.query({
          resourceKey: source.resourceKey,
          query,
          params: "params" in source ? source.params : undefined,
          locale,
          timeZone,
          signal: abortController.signal,
        });
        if (abortController.signal.aborted) return;
        const nextFolders = readPhiMediaFolders(data.meta?.folders);
        const nextAssets = readPhiMediaAssetTiles(data.items);
        setAssets(nextAssets);
        for (const asset of nextAssets) assetCacheRef.current.set(asset.id, asset);
        setFolders(nextFolders);
        setSpaces(readPhiMediaSpaces(data.meta?.spaces));
        // The answer says which Space it actually served, so the selector follows the control plane
        // rather than the other way round -- including the first load, which asked for nothing.
        const activeAddress = readPhiMediaSpace(data.meta?.activeSpace)?.address ?? null;
        if (activeAddress) setSpaceAddress(activeAddress);
        setTotal(data.total);
      } catch (error) {
        if (!abortController.signal.aborted) {
          // A refused or failed read is not an empty library; saying "No assets found" would hide it.
          console.error("Media picker failed to load assets.", error);
          setAssets([]);
          setTotal(0);
          setLoadFailed(true);
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => abortController.abort();
  }, [activeSource, isOpen, locale, provider, query, refreshToken, source, startFolderPending, timeZone]);

  const activeSourceId = activeSource?.id ?? null;
  const readSourcePage = useCallback(async (cursor: string | null, signal: AbortSignal) => {
    if (!activeSource) return null;
    return activeSource.list({
      query: sourceQuery,
      kinds: [mediaType],
      cursor,
      limit: sourcePageSize,
      locale,
      signal,
    });
  }, [activeSource, locale, mediaType, sourcePageSize, sourceQuery]);

  // The first page of the active source, again whenever the source or what was typed changes.
  useEffect(() => {
    if (!isOpen || !activeSourceId) return;
    const abortController = new AbortController();
    sourceRequestRef.current = abortController;
    void (async () => {
      setSourceLoading(true);
      setSourceFailed(false);
      setSourcePageOf({ sourceId: activeSourceId, items: [] });
      setSourceCursor(null);
      try {
        const page = await readSourcePage(null, abortController.signal);
        if (!page || abortController.signal.aborted) return;
        setSourcePageOf({ sourceId: activeSourceId, items: page.items });
        setSourceCursor(page.nextCursor);
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error("Media source failed to list.", error);
        setSourceFailed(true);
      } finally {
        if (!abortController.signal.aborted) setSourceLoading(false);
      }
    })();
    // Also what "Load more" asked since: it answers the question that was asked before.
    return () => {
      abortController.abort();
      sourceRequestRef.current?.abort();
    };
  }, [activeSourceId, isOpen, readSourcePage]);

  /*
   * A closed picker stops what it asked: the listing, an import or an upload on its way -- nothing is to
   * choose for it afterwards -- and the Folder it opens on.
   */
  useEffect(() => {
    if (isOpen) return;
    uploadRef.current?.cancel();
    sourceRequestRef.current?.abort();
    importRequestRef.current?.abort();
    importRequestRef.current = null;
    startFolderRequestRef.current?.abort();
    startFolderRequestRef.current = null;
  }, [isOpen]);
  useEffect(() => () => {
    sourceRequestRef.current?.abort();
    importRequestRef.current?.abort();
    startFolderRequestRef.current?.abort();
  }, []);

  const loadMoreSourceItems = () => {
    if (!sourceCursor || sourceLoading) return;
    const abortController = new AbortController();
    sourceRequestRef.current = abortController;
    setSourceLoading(true);
    setSourceFailed(false);
    void (async () => {
      try {
        const page = await readSourcePage(sourceCursor, abortController.signal);
        if (!page || abortController.signal.aborted) return;
        setSourcePageOf((current) => ({ sourceId: current.sourceId, items: [...current.items, ...page.items] }));
        setSourceCursor(page.nextCursor);
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error("Media source failed to list.", error);
        setSourceFailed(true);
      } finally {
        if (!abortController.signal.aborted) setSourceLoading(false);
      }
    })();
  };

  /**
   * Imports the chosen item and answers the Asset it became, which the Control then chooses exactly as it
   * would a tile of the library. Nothing but a refusal says anything: a stopped import (the picker closed,
   * another source chosen) is not a failure, and the picker stays in the source view for the reader to
   * try again.
   */
  const importSourceItem = async (item: PhisMediaSourceItem): Promise<PhiMediaAssetTile | null> => {
    if (!activeSource || importRequestRef.current) return null;
    const abortController = new AbortController();
    importRequestRef.current = abortController;
    setImportingItemId(item.id);
    setImportFailure(null);
    try {
      const imported = await activeSource.importItem({ item, folderId, signal: abortController.signal });
      if (abortController.signal.aborted) return null;
      let tile = imported.asset;
      if (imported.metadata) {
        /*
         * A Module's file arrives titled after its file name; its own title and alt text are written
         * through the Asset update the library already has. The Asset exists by now, so a refusal here
         * leaves it chosen with the file's name rather than losing what was imported.
         */
        try {
          await updateAsset({
            actionKey: "update",
            itemKey: tile.id,
            item: { title: imported.metadata.title, altText: imported.metadata.altText },
            query,
          });
          tile = { ...tile, title: imported.metadata.title, altText: imported.metadata.altText };
        } catch (error) {
          console.error("Media picker could not set the imported Asset's title.", error);
        }
        if (abortController.signal.aborted) return null;
      }
      assetCacheRef.current.set(tile.id, tile);
      setSourceId("");
      return tile;
    } catch (error) {
      if (abortController.signal.aborted) return null;
      console.error("Media source import failed.", error);
      setImportFailure(readPhiMediaSourceImportErrorMessage(error, labels.upload.refusals, labels.picker.importFailedText));
      return null;
    } finally {
      if (importRequestRef.current === abortController) importRequestRef.current = null;
      setImportingItemId(null);
    }
  };

  const resolvedAssets = provider && source ? assets : [];

  /** Asks for the Folder the picker opens on (`openOnFolder`); the listing waits until it is answered. */
  const openOnStartFolder = () => {
    if (!openOnFolder) return;
    startFolderRequestRef.current?.abort();
    const abortController = new AbortController();
    startFolderRequestRef.current = abortController;
    setStartFolderPending(true);
    setStartFolderFailure(null);
    setOnIncompleteStartFolder(false);
    void (async () => {
      try {
        const startFolder = await openOnFolder(abortController.signal);
        if (abortController.signal.aborted) return;
        setFolderId(startFolder.folderId);
        setOnIncompleteStartFolder(!startFolder.complete);
        setPage(1);
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error("Media picker could not open its Folder.", error);
        setFolderId(null);
        setPage(1);
        setStartFolderFailure(readPhiMediaSourceImportErrorMessage(error, labels.upload.refusals, labels.upload.refusals.errorGeneric));
      } finally {
        if (startFolderRequestRef.current === abortController) startFolderRequestRef.current = null;
        // Closed or opened again meanwhile: a newer question is pending, or none is wanted.
        if (startFolderRequestRef.current == null) setStartFolderPending(false);
      }
    })();
  };

  /*
   * The upload goes into the Folder in view, on the Site Space only (`PhiMediaPickerUploadBinding`) --
   * into the start Folder's whole path while the picker stands on the part of it that is there, and the
   * picker then shows the Folder the file landed in. The list is read again whatever came of it, so a
   * finished upload stands among the tiles -- greyed out, where the host does not let it be chosen -- and
   * what comes back is chosen like a picked tile.
   */
  const uploadOffered = upload != null && onSiteSpace;
  const sendUpload = async (file: File): Promise<PhiMediaAssetTile | null> => {
    if (!upload) return null;
    const intoStartFolder = onIncompleteStartFolder;
    let tile: PhiMediaAssetTile | null = null;
    try {
      tile = await upload.send(file, folderId, intoStartFolder);
    } catch (error) {
      console.error("Media picker upload failed.", error);
    }
    if (tile && intoStartFolder) {
      setFolderId(tile.folderId);
      setOnIncompleteStartFolder(false);
      setPage(1);
    }
    setRefreshToken((current) => current + 1);
    if (!tile) return null;
    assetCacheRef.current.set(tile.id, tile);
    return tile;
  };

  const updateOpen = (next: boolean) => {
    if (controlledOpen == null) setLocalOpen(next);
    if (next) {
      // A picker opens on the Site's library, whatever source the last opening ended in.
      setSourceId("");
      setImportFailure(null);
      openOnStartFolder();
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
    sources: sourceOptions,
    sourceValue: activeSource?.id ?? "",
    sourceItems: activeSource && sourcePageOf.sourceId === activeSource.id ? sourcePageOf.items : [],
    sourceHasMore: activeSource != null && sourceCursor != null,
    importingItemId,
    sourceNotice: importFailure,
    onUpload: uploadOffered ? sendUpload : undefined,
    uploadAccept: uploadOffered ? upload.accept : undefined,
    uploadProgress: uploadOffered ? upload.progress : null,
    uploadNotice: uploadOffered ? startFolderFailure ?? upload.notice : startFolderFailure,
    folders: provider && source ? folderOptions : [],
    folderValue,
    query: searchQuery,
    page,
    pageSize,
    minColumnWidth,
    total: provider && source ? total : 0,
    loading: activeSource ? sourceLoading : loading,
    showSearchBar: config?.showSearchBar ?? true,
    showFolderFilter: config?.showFolderFilter ?? true,
    showPagination: config?.showPagination ?? true,
    trigger,
    labels: { trigger: labels.picker.triggerLabel, title: labels.picker.popoverTitle, search: labels.tool.searchPlaceholder ?? searchLabels.placeholder, folder: labels.tool.folderLabel, space: labels.space.label, empty: bindingError ?? (loadFailed ? labels.picker.loadFailedDescription : labels.picker.emptyDescription), sourceEmpty: sourceFailed ? labels.picker.sourceFailedText : labels.picker.emptyDescription, clear: labels.picker.clearLabel, reload: labels.tool.reloadLabel, tileSize: labels.picker.tileSizeLabel, source: labels.picker.sourceLabel, importing: labels.picker.importingLabel, loadMore: labels.picker.loadMoreLabel, upload: labels.upload.uploadToggleLabel },
    getPopupContainer,
    popupRootClassName,
    isAssetSelectable,
    onOpenChange: updateOpen,
    onCommit,
    onDiscard,
    onQueryChange: (nextQuery: string) => { setSearchQuery(nextQuery); setPage(1); querySignals.emitCapability("query", nextQuery); },
    onSpaceChange: (nextSpace: string) => {
      if (!spaceSelectionAllowed) return;
      // Folders belong to the Space they were listed from, so switching Space starts at its root.
      setSpaceAddress(nextSpace);
      setRequestedSpaceAddress(nextSpace);
      setFolderId(null);
      setOnIncompleteStartFolder(false);
      setPage(1);
    },
    onSourceChange: (nextSource: string) => {
      // What was asked of the source before is not an answer to what is asked now.
      importRequestRef.current?.abort();
      importRequestRef.current = null;
      setImportFailure(null);
      setSourceId(nextSource);
    },
    onSourceItemSelect: importSourceItem,
    onSourceLoadMore: loadMoreSourceItems,
    onFolderChange: (nextFolder: string) => { setFolderId(resolvePhiMediaFolderIdFromValue(folders, nextFolder)); setOnIncompleteStartFolder(false); setPage(1); pathSignals.emitCapability("path", nextFolder); },
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
