"use client";

import { useCallback, useEffect, useState } from "react";

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
} from "./phi-image-preview-store";
import { PhiMediaAssetFlags, PhiMediaKind } from "../../constants/media";
import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress, createPhiSignalSubcontrolAddress } from "../../types/signals";
import type { PhiMediaKindValue } from "../../types/media";
import type { PhiSignal, PhiSignalAddress } from "../../types/signals";
import type { PhiMediaAssetFolder } from "../../types/media";
import { usePhiSignalListener } from "../runtime/runtime-signal-bus";
import { usePhiSignalEmitter } from "../runtime/runtime-signal-identity";
import { usePhiSignalInstancesReady } from "../runtime/runtime-signal-registry";
import { createPhiRuntimeFormControllerAddress } from "../forms/runtime-form-controller-address";
import { createPhiAssetControllerAddress } from "./asset-controller-address";
import {
  PHI_ASSET_CONTROLLER_STORE_KEY,
  PHI_ASSET_SIGNAL_CHANNELS,
} from "./asset-controller-signals";
import {
  PHI_ASSET_INSPECTOR_OVERLAY_IDS,
  PHI_ASSET_INSPECTOR_WIDGET_IDS,
  PHI_ASSET_MEDIA_PAGE_WIDGET_IDS,
} from "./asset-inspector-addresses";
import { normalizeMediaFocalRect } from "./focal-rect";
export {
  PHI_ASSET_CONTROLLER_STORE_KEY,
  PHI_ASSET_SIGNAL_CHANNELS,
} from "./asset-controller-signals";

const ASSET_METADATA_FORM_WIDGET_ADDRESS = createPhiSignalAddress(
  "cms",
  PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaMetadataForm,
);
const ASSET_METADATA_FORM_CONTROLLER_ADDRESS = createPhiRuntimeFormControllerAddress(
  `widget-${PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaMetadataForm}`,
);
const ASSET_INSPECTOR_OVERLAY_ADDRESS = createPhiSignalAddress(
  "cms",
  PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaInspector,
);
const ASSET_COLLECTION_WIDGET_ADDRESS = createPhiSignalAddress(
  "cms",
  PHI_ASSET_MEDIA_PAGE_WIDGET_IDS.widgetMediaPreview,
);
const ASSET_FOLDER_FORM_WIDGET_ADDRESS = createPhiSignalAddress(
  "cms",
  PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateForm,
);
const ASSET_FOLDER_FORM_CONTROLLER_ADDRESS = createPhiRuntimeFormControllerAddress(
  `widget-${PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateForm}`,
);
const ASSET_FOLDER_OVERLAY_ADDRESS = createPhiSignalAddress(
  "cms",
  PHI_ASSET_INSPECTOR_OVERLAY_IDS.overlayMediaFolderCreate,
);
const ASSET_INSPECTOR_SAVE_ADDRESS = createPhiSignalSubcontrolAddress(
  "cms",
  PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaInspectorCommands,
  "save",
);
const ASSET_FOLDER_SAVE_ADDRESS = createPhiSignalSubcontrolAddress(
  "cms",
  PHI_ASSET_INSPECTOR_WIDGET_IDS.widgetMediaFolderCreateCommands,
  "save",
);
const ASSET_FORM_FLAG_VALUES = Object.values(PhiMediaAssetFlags);

type PhiAssetInspectorRequest = {
  assetId: number;
  correlationId: string;
};

type PhiAssetFolderRequest = {
  correlationId: string;
  parentPath: string;
};

export function buildPhiMediaFolderOptions(folders: PhiMediaAssetFolder[]) {
  const byParentId = new Map<number | null, PhiMediaAssetFolder[]>();
  for (const folder of folders) {
    const bucket = byParentId.get(folder.parentId) ?? [];
    bucket.push(folder);
    byParentId.set(folder.parentId, bucket);
  }

  for (const bucket of byParentId.values()) {
    bucket.sort((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
  }

  function visit(folder: PhiMediaAssetFolder): {
    value: number;
    label: string;
    children?: ReturnType<typeof visit>[];
  } {
    const children = (byParentId.get(folder.id) ?? []).map((child) => visit(child));
    return children.length > 0
      ? { value: folder.id, label: folder.name, children }
      : { value: folder.id, label: folder.name };
  }

  return (byParentId.get(null) ?? []).map((folder) => visit(folder));
}

export function buildPhiMediaFolderPathById(folders: PhiMediaAssetFolder[], folderId: number | null) {
  if (folderId == null) {
    return [];
  }

  const byId = new Map(folders.map((folder) => [folder.id, folder] as const));
  const path: number[] = [];
  const visited = new Set<number>();
  let currentId: number | null = folderId;

  while (currentId != null) {
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const folder = byId.get(currentId);
    if (!folder) {
      break;
    }

    path.unshift(folder.id);
    currentId = folder.parentId;
  }

  return path;
}

export function buildPhiMediaFolderValueById(folders: PhiMediaAssetFolder[], folderId: number | null) {
  const path = buildPhiMediaFolderPathById(folders, folderId);
  return path.length > 0 ? `/${path.join("/")}` : "/";
}

export function buildPhiMediaFolderCascaderOptions(folders: PhiMediaAssetFolder[]) {
  return [...folders]
    .sort((left, right) => {
      const leftPath = buildPhiMediaFolderPathById(folders, left.id);
      const rightPath = buildPhiMediaFolderPathById(folders, right.id);
      return leftPath.length - rightPath.length || left.sortOrder - right.sortOrder || left.id - right.id;
    })
    .map((folder) => ({
      value: buildPhiMediaFolderValueById(folders, folder.id),
      label: folder.name,
    }));
}

export function resolvePhiMediaFolderIdFromValue(folders: PhiMediaAssetFolder[], value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "/") {
    return null;
  }

  const lastSegment = trimmed.split("/").filter(Boolean).at(-1);
  if (!lastSegment) {
    return null;
  }

  const folderId = Number(lastSegment);
  return Number.isInteger(folderId) && folders.some((folder) => folder.id === folderId) ? folderId : null;
}

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

export function combinePhiMediaFlagValues(presentationFlags: number[]) {
  return presentationFlags.reduce((accumulator, flag) => accumulator | flag, 0);
}

function matchesAssetControllerSignal(signal: PhiSignal) {
  return signal.receiver === createPhiAssetControllerAddress();
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

export function usePhiAssetRuntimeController(mountScope: "site" | "area" | "page") {
  const state = usePhiImagePreviewStore(PHI_ASSET_CONTROLLER_STORE_KEY);
  const emitAssetSignal = usePhiSignalEmitter(createPhiAssetControllerAddress());
  const [inspectorRequest, setInspectorRequest] = useState<PhiAssetInspectorRequest | null>(null);
  const [inspectorSubmitting, setInspectorSubmitting] = useState(false);
  const [folderRequest, setFolderRequest] = useState<PhiAssetFolderRequest | null>(null);
  const [folderSubmitting, setFolderSubmitting] = useState(false);
  const formReady = usePhiSignalInstancesReady([
    ASSET_METADATA_FORM_WIDGET_ADDRESS,
    ASSET_METADATA_FORM_CONTROLLER_ADDRESS,
  ]);
  const folderFormReady = usePhiSignalInstancesReady([
    ASSET_FOLDER_FORM_WIDGET_ADDRESS,
    ASSET_FOLDER_FORM_CONTROLLER_ADDRESS,
  ]);

  const sendPageSignal = useCallback((input: {
    receiver: PhiSignalAddress;
    channel: string;
    action: PhiSignal["action"];
    value: PhiSignal["value"];
    valueType: PhiSignal["valueType"];
    valueSchema?: PhiSignal["valueSchema"];
    correlationId: string;
  }) => {
    emitAssetSignal({
      scope: "page",
      receiver: input.receiver,
      channel: input.channel,
      action: input.action,
      value: input.value,
      valueType: input.valueType,
      valueSchema: input.valueSchema ?? null,
      correlationId: input.correlationId,
      timestamp: Date.now(),
    });
  }, [emitAssetSignal]);

  usePhiSignalListener(
    (signal) => {
      if (!matchesAssetControllerSignal(signal)) {
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
        const filters = collectionQuery && typeof collectionQuery === "object" && !Array.isArray(collectionQuery)
          ? (collectionQuery as { filters?: unknown }).filters
          : null;
        const folderId = filters && typeof filters === "object" && !Array.isArray(filters)
          ? (filters as { folderId?: unknown }).folderId
          : null;
        setFolderRequest({
          correlationId: signal.correlationId,
          parentPath: buildPhiMediaFolderNamePath(
            state.folders,
            typeof folderId === "number" && Number.isInteger(folderId) ? folderId : null,
          ) || "/",
        });
        sendPageSignal({
          receiver: ASSET_FOLDER_OVERLAY_ADDRESS,
          channel: "dialog",
          action: "open",
          value: null,
          valueType: "none",
          correlationId: signal.correlationId,
        });
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.folderCommand && signal.action === "activate") {
        if (signal.value === "cancel") {
          sendPageSignal({ receiver: ASSET_FOLDER_FORM_WIDGET_ADDRESS, channel: "reset", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
          sendPageSignal({ receiver: ASSET_FOLDER_OVERLAY_ADDRESS, channel: "dialog", action: "close", value: null, valueType: "none", correlationId: signal.correlationId });
        } else if (signal.value === "save" && !folderSubmitting) {
          sendPageSignal({ receiver: ASSET_FOLDER_FORM_WIDGET_ADDRESS, channel: "submit", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
        }
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.folderSubmitting && signal.action === "change" && typeof signal.value === "boolean") {
        setFolderSubmitting(signal.value);
        sendPageSignal({ receiver: ASSET_FOLDER_SAVE_ADDRESS, channel: "submitting", action: "change", value: signal.value, valueType: "boolean", correlationId: signal.correlationId });
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.folderSubmit && signal.action === "activate") {
        setFolderSubmitting(false);
        sendPageSignal({ receiver: ASSET_FOLDER_OVERLAY_ADDRESS, channel: "dialog", action: "close", value: null, valueType: "none", correlationId: signal.correlationId });
        sendPageSignal({ receiver: ASSET_COLLECTION_WIDGET_ADDRESS, channel: "reload", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.command && signal.action === "activate") {
        if (signal.value === "cancel") {
          sendPageSignal({ receiver: ASSET_METADATA_FORM_WIDGET_ADDRESS, channel: "reset", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
          sendPageSignal({ receiver: ASSET_INSPECTOR_OVERLAY_ADDRESS, channel: "dialog", action: "close", value: null, valueType: "none", correlationId: signal.correlationId });
        } else if (signal.value === "save" && !inspectorSubmitting) {
          sendPageSignal({ receiver: ASSET_METADATA_FORM_WIDGET_ADDRESS, channel: "submit", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
        }
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.submitting && signal.action === "change" && typeof signal.value === "boolean") {
        setInspectorSubmitting(signal.value);
        sendPageSignal({ receiver: ASSET_INSPECTOR_SAVE_ADDRESS, channel: "submitting", action: "change", value: signal.value, valueType: "boolean", correlationId: signal.correlationId });
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.submit && signal.action === "activate") {
        setInspectorSubmitting(false);
        sendPageSignal({ receiver: ASSET_INSPECTOR_OVERLAY_ADDRESS, channel: "dialog", action: "close", value: null, valueType: "none", correlationId: signal.correlationId });
        sendPageSignal({ receiver: ASSET_COLLECTION_WIDGET_ADDRESS, channel: "reload", action: "activate", value: null, valueType: "none", correlationId: signal.correlationId });
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
        if (signal.value && typeof signal.value === "object" && !Array.isArray(signal.value)) {
          const queryValue = (signal.value as { searchQuery?: unknown }).searchQuery;
          setPhiImagePreviewSearchQuery(PHI_ASSET_CONTROLLER_STORE_KEY, typeof queryValue === "string" ? queryValue : "");
        }
        return;
      }

      if (signal.channel === PHI_ASSET_SIGNAL_CHANNELS.pagination && signal.value && typeof signal.value === "object" && !Array.isArray(signal.value)) {
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
  );

  useEffect(() => {
    if (!inspectorRequest || !formReady) return;
    const asset = state.selectedAsset?.id === inspectorRequest.assetId
      ? state.selectedAsset
      : state.assets.find((entry) => entry.id === inspectorRequest.assetId) ?? null;
    if (!asset) return;
    sendPageSignal({
      receiver: ASSET_METADATA_FORM_CONTROLLER_ADDRESS,
      channel: "values",
      action: "change",
      value: {
        values: {
          assetId: asset.id,
          imageUrl: asset.previewUrl ?? asset.deliveryUrl,
          imageAlt: asset.altText ?? asset.title ?? asset.originalName,
          folderPath: buildPhiMediaFolderNamePath(state.folders, asset.folderId),
          title: asset.title ?? "",
          altText: asset.altText ?? "",
          presentationFlags: ASSET_FORM_FLAG_VALUES.filter((flag) => (asset.presentationFlags & flag) === flag).map(String),
          focalRect: normalizeMediaFocalRect(asset.meta?.focalRect) ?? null,
        },
      },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      correlationId: inspectorRequest.correlationId,
    });
  }, [formReady, inspectorRequest, sendPageSignal, state.assets, state.folders, state.selectedAsset]);

  useEffect(() => {
    if (!folderRequest || !folderFormReady) return;
    sendPageSignal({
      receiver: ASSET_FOLDER_FORM_CONTROLLER_ADDRESS,
      channel: "values",
      action: "change",
      value: { values: { name: "", parentPath: folderRequest.parentPath } },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.formValues,
      correlationId: folderRequest.correlationId,
    });
  }, [folderFormReady, folderRequest, sendPageSignal]);

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
