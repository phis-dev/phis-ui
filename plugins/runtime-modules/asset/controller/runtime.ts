"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  bumpPhiImagePreviewRefreshToken,
  setPhiImagePreviewFlags,
  setPhiImagePreviewFolderId,
  setPhiImagePreviewFolderPath,
  setPhiImagePreviewKind,
  setPhiImagePreviewPage,
  setPhiImagePreviewPageSize,
  setPhiImagePreviewSearchQuery,
  usePhiImagePreviewStore,
} from "../../../../components/media/phi-image-preview-store";
import { PhiMediaAssetFlags, PhiMediaKind } from "../../../../constants/media";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import type { PhiMediaKindValue } from "../../../../types/media";
import type { PhiSignalAddress, PhiSignalValue } from "../../../../types/signals";
import type { PhiMediaAssetFolder } from "../../../../types/media";
import type { PhiRuntimeControllerMountScope } from "../../../../types";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../components/runtime/runtime-signal-bus";
import {
  dispatchPhiSignalCapability,
  usePhiSignalEmitter,
} from "../../../../components/runtime/runtime-signal-identity";
import {
  PHI_ASSET_CONTROLLER_STORE_KEY,
  PHI_ASSET_SIGNAL_CHANNELS,
} from "../../../../components/media/asset-controller-signals";
import type { PhiAssetRuntimeControllerConfig } from "./definition";
import { normalizeMediaFocalRect } from "../../../../components/media/focal-rect";
import {
  resolvePhiMediaFolderIdFromValue,
  combinePhiMediaFlagValues,
} from "../../../../components/media/media-folder-options";

const ASSET_FORM_FLAG_VALUES = Object.values(PhiMediaAssetFlags);

type PhiAssetInspectorRequest = {
  assetId: number;
  correlationId: string;
};

type PhiAssetFolderRequest = {
  correlationId: string;
  parentPath: string;
};

function splitPhiMediaFolderNamePath(value: string | null | undefined) {
  return (value ?? "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function buildPhiMediaFolderNamePath(folders: PhiMediaAssetFolder[], folderId: number | null) {
  if (folderId == null) return "";
  const byId = new Map(folders.map((folder) => [folder.id, folder] as const));
  const path: string[] = [];
  const visited = new Set<number>();
  let currentId: number | null = folderId;
  while (currentId != null && !visited.has(currentId)) {
    visited.add(currentId);
    const folder = byId.get(currentId);
    if (!folder) break;
    path.unshift(folder.name);
    currentId = folder.parentId;
  }
  return path.length > 0 ? `/${path.join("/")}` : "";
}


function isPhiMediaKindValue(value: unknown): value is PhiMediaKindValue {
  return (
    value === PhiMediaKind.Image ||
    value === PhiMediaKind.Video ||
    value === PhiMediaKind.Audio ||
    value === PhiMediaKind.Pdf ||
    value === PhiMediaKind.Markdown ||
    value === PhiMediaKind.Document ||
    value === PhiMediaKind.Archive ||
    value === PhiMediaKind.Font ||
    value === PhiMediaKind.Binary ||
    value === PhiMediaKind.Other
  );
}

function combinePhiMediaSignalFlagValues(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }
  const presentationFlags = value.filter((entry): entry is number => typeof entry === "number" && Number.isInteger(entry));
  return presentationFlags.length > 0 ? combinePhiMediaFlagValues(presentationFlags) : null;
}

export function usePhiAssetRuntimeController({
  address,
  mountScope,
  config,
}: {
  address: PhiSignalAddress;
  mountScope: PhiRuntimeControllerMountScope;
  config: PhiAssetRuntimeControllerConfig;
}) {
  const state = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const emitAssetSignal = usePhiSignalEmitter(address);
  const dispatchSignal = usePhiSignalDispatcher();
  const [inspectorRequest, setInspectorRequest] = useState<PhiAssetInspectorRequest | null>(null);
  const [inspectorSubmitting, setInspectorSubmitting] = useState(false);
  const [folderRequest, setFolderRequest] = useState<PhiAssetFolderRequest | null>(null);
  const [folderSubmitting, setFolderSubmitting] = useState(false);

  /*
   * One declared output, delivered through every route the Page wrote for it.
   *
   * The receivers -- the inspector and folder dialogs, their Forms, the collection -- used to be Widget
   * ids of the Media Page written into this file, so the Controller worked on that one Page and on no
   * copy of it. The Page names them now (`controllerSettings`); a Page that names none, or an Area that
   * runs this Controller only for its pickers, gets a Controller that opens nothing.
   */
  const emitRoutes = useMemo(() => config.signalRoutes?.emits ?? [], [config.signalRoutes?.emits]);
  const emitCapability = useCallback((
    capabilityId: string,
    value: PhiSignalValue,
    correlationId: string,
  ) => dispatchPhiSignalCapability(dispatchSignal, address, emitRoutes, capabilityId, value, correlationId), [address, dispatchSignal, emitRoutes]);

  usePhiSignalListener(
    (signal) => {
      if (signal.receiver !== address) {
        return;
      }
      if (
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.reload &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.kind &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.presentationFlags &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.path &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.query &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.pagination &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.selection &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.command &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.submit &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.submitting &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.collectionAction &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.folderCommand &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.folderSubmit &&
        signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.folderSubmitting
      ) {
        return;
      }

      if (
        signal.channel === PHI_ASSET_SIGNAL_CHANNELS.selection &&
        signal.action === "change" &&
        signal.value &&
        typeof signal.value === "object" &&
        !Array.isArray(signal.value)
      ) {
        const assetId = (signal.value as { assetId?: unknown }).assetId;
        if (typeof assetId === "number" && Number.isInteger(assetId) && assetId > 0) {
          setInspectorRequest({ assetId, correlationId: signal.correlationId });
          /*
           * The Controller opens the inspector, as it opens the folder dialog beside it.
           *
           * The collection used to open it directly and tell the Controller separately, which is two
           * sentences about one gesture -- and it hid the day the Controller stopped hearing anything:
           * the drawer still opened, on an empty form, over a Save that did nothing. A selection is
           * reported to the Controller, and what the Controller does about it is the Controller's.
           */
          emitCapability("inspectorOpen", null, signal.correlationId);
        }
        return;
      }

      if (
        signal.channel === PHI_ASSET_SIGNAL_CHANNELS.collectionAction &&
        signal.action === "activate" &&
        signal.value &&
        typeof signal.value === "object" &&
        !Array.isArray(signal.value) &&
        (signal.value as { actionKey?: unknown }).actionKey === "createFolder"
      ) {
        const collectionQuery = (signal.value as { query?: unknown }).query;
        const filters = isPhiRecord(collectionQuery)
          ? (collectionQuery as { filters?: unknown }).filters
          : null;
        const folderId = isPhiRecord(filters)
          ? (filters as { folderId?: unknown }).folderId
          : null;
        setFolderRequest({
          correlationId: signal.correlationId,
          parentPath: buildPhiMediaFolderNamePath(
            state.folders,
            typeof folderId === "number" && Number.isInteger(folderId) ? folderId : null,
          ) || "/",
        });
        emitCapability("folderDialogOpen", null, signal.correlationId);
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.folderCommand && signal.action === "activate") {
        if (signal.value === "cancel") {
          emitCapability("folderReset", null, signal.correlationId);
          emitCapability("folderDialogClose", null, signal.correlationId);
        } else if (signal.value === "save" && !folderSubmitting) {
          emitCapability("folderSubmit", null, signal.correlationId);
        }
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.folderSubmitting && signal.action === "change" && typeof signal.value === "boolean") {
        setFolderSubmitting(signal.value);
        emitCapability("folderSubmitting", signal.value, signal.correlationId);
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.folderSubmit && signal.action === "activate") {
        setFolderSubmitting(false);
        emitCapability("folderDialogClose", null, signal.correlationId);
        emitCapability("collectionReload", null, signal.correlationId);
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.command && signal.action === "activate") {
        if (signal.value === "cancel") {
          setInspectorRequest(null);
          emitCapability("metadataReset", null, signal.correlationId);
          emitCapability("inspectorClose", null, signal.correlationId);
        } else if (signal.value === "save" && !inspectorSubmitting) {
          emitCapability("metadataSubmit", null, signal.correlationId);
        }
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.submitting && signal.action === "change" && typeof signal.value === "boolean") {
        setInspectorSubmitting(signal.value);
        emitCapability("inspectorSubmitting", signal.value, signal.correlationId);
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.submit && signal.action === "activate") {
        setInspectorSubmitting(false);
        setInspectorRequest(null);
        emitCapability("inspectorClose", null, signal.correlationId);
        emitCapability("collectionReload", null, signal.correlationId);
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.reload) {
        if (signal.action !== "activate") {
          return;
        }
        bumpPhiImagePreviewRefreshToken(PHI_ASSET_CONTROLLER_STORE_KEY);
        return;
      }

      if (signal.action !== "change") {
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.kind && isPhiMediaKindValue(signal.value)) {
        setPhiImagePreviewKind(PHI_ASSET_CONTROLLER_STORE_KEY, signal.value);
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.presentationFlags) {
        setPhiImagePreviewFlags(PHI_ASSET_CONTROLLER_STORE_KEY, combinePhiMediaSignalFlagValues(signal.value));
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.query) {
        if (typeof signal.value === "string") {
          setPhiImagePreviewSearchQuery(PHI_ASSET_CONTROLLER_STORE_KEY, signal.value);
          return;
        }
        if (isPhiRecord(signal.value)) {
          const queryValue = (signal.value as { searchQuery?: unknown }).searchQuery;
          setPhiImagePreviewSearchQuery(PHI_ASSET_CONTROLLER_STORE_KEY, typeof queryValue === "string" ? queryValue : "");
        }
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.pagination && isPhiRecord(signal.value)) {
        const value = signal.value as { page?: unknown; pageSize?: unknown };
        if (typeof value.pageSize === "number" && Number.isInteger(value.pageSize) && value.pageSize > 0) {
          setPhiImagePreviewPageSize(PHI_ASSET_CONTROLLER_STORE_KEY, value.pageSize);
        }
        if (typeof value.page === "number" && Number.isInteger(value.page) && value.page > 0) {
          setPhiImagePreviewPage(PHI_ASSET_CONTROLLER_STORE_KEY, value.page);
        }
        return;
      }

      if (signal.channel !== PHI_ASSET_SIGNAL_CHANNELS.path || typeof signal.value !== "string") {
        return;
      }

      const existingFolderId = resolvePhiMediaFolderIdFromValue(state.folders, signal.value);
      if (existingFolderId != null || splitPhiMediaFolderNamePath(signal.value).length === 0) {
        setPhiImagePreviewFolderId(PHI_ASSET_CONTROLLER_STORE_KEY, existingFolderId);
      } else {
        setPhiImagePreviewFolderPath(PHI_ASSET_CONTROLLER_STORE_KEY, splitPhiMediaFolderNamePath(signal.value));
      }
    },
    {
      channels: Object.values(PHI_ASSET_SIGNAL_CHANNELS),
    },
    /*
     * The address this listener answers for.
     *
     * A receiver with an instance and no listener counted for it is not wrong, it is "not ready yet",
     * so every signal addressed here was held rather than delivered -- and held silently, which is why
     * the media inspector opened with an empty form and its Save did nothing at all. The instance the
     * controller mount registers says the address exists; this says somebody is behind it.
     */
    address,
  );

  useEffect(() => {
    if (!inspectorRequest) return;
    const asset = state.selectedAsset?.id === inspectorRequest.assetId
      ? state.selectedAsset
      : state.assets.find((entry) => entry.id === inspectorRequest.assetId) ?? null;
    if (!asset) return;
    emitCapability("metadataValues", {
        values: {
          assetId: asset.id,
          imageUrl: asset.previewUrl ?? asset.deliveryUrl,
          imageAlt: asset.altText ?? asset.title ?? asset.originalName,
          /*
           * The field is `folderId`, a Select whose options carry the id as a string (`valueMode: "id"`).
           * Handing it the name path under another key left the Select empty, and a submit that only
           * changed the alt text then sent `folderId: null` -- which the server reads as "move to the
           * root folder".
           */
          folderId: asset.folderId == null ? null : String(asset.folderId),
          title: asset.title ?? "",
          altText: asset.altText ?? "",
          presentationFlags: ASSET_FORM_FLAG_VALUES.filter((flag) => (asset.presentationFlags & flag) === flag).map(String),
          focalRect: normalizeMediaFocalRect(asset.meta?.focalRect) ?? null,
        },
      }, inspectorRequest.correlationId);
  }, [emitCapability, inspectorRequest, state.assets, state.folders, state.selectedAsset]);

  useEffect(() => {
    if (!folderRequest) return;
    emitCapability(
      "folderValues",
      { values: { name: "", parentPath: folderRequest.parentPath } },
      folderRequest.correlationId,
    );
  }, [emitCapability, folderRequest]);

  useEffect(() => {
    emitAssetSignal({
      scope: mountScope,
      channel: PHI_ASSET_SIGNAL_CHANNELS.pagination,
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pagination,
      value: {
        page: state.page,
        pageSize: state.pageSize,
        total: state.pagination?.total ?? state.assets.length,
      },
      receiver: "broadcast",
      timestamp: Date.now(),
    });
  }, [emitAssetSignal, mountScope, state.assets.length, state.page, state.pageSize, state.pagination?.total]);

  return state;
}
