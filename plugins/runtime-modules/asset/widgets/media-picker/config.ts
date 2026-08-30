import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { normalizePhiMediaKind, PhiMediaKind } from "../../../../../constants/media";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalRouteSet,
  readPhiSignalRouteSet,
} from "../../../../../types/signals";
import type { PhiMediaKindValue } from "../../../../../types/media";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../ids";
import type { PhiCollectionProviderDataSource } from "../../../../../types/collection-provider";
import { readBoolean, readNumber, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH,
  PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH,
  PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH,
  normalizePhiMediaPickerMinColumnWidth,
} from "../../../../../components/controls/phi-media-picker-control-contract";

export type PhiCmsMediaPickerWidgetConfig = PhiCmsWidgetConfigBase & {
  mediaType?: PhiMediaKindValue | null;
  presentationFlags?: number | null;
  pageSize?: number;
  minColumnWidth?: number;
  showSearchBar?: boolean;
  showFolderFilter?: boolean;
  showPagination?: boolean;
  signalRoutes?: PhiSignalRouteSet | null;
  dataSource?: PhiCollectionProviderDataSource | null;
};

const PHI_MEDIA_PICKER_DATA_SOURCE = {
  providerKey: PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection,
  resourceKey: "assets",
} as const satisfies PhiCollectionProviderDataSource;

export function normalizePhiCmsMediaPickerWidgetConfig(config: unknown): PhiCmsMediaPickerWidgetConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {
      mediaType: PhiMediaKind.Image,
      presentationFlags: null,
      pageSize: 20,
      minColumnWidth: PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH,
      showSearchBar: true,
      showFolderFilter: true,
      showPagination: true,
      signalRoutes: null,
      dataSource: PHI_MEDIA_PICKER_DATA_SOURCE,
    };
  }

  const raw = config as Record<string, unknown>;
  const rawMediaType = readString(raw.mediaType);
  return {
    mediaType: rawMediaType ? normalizePhiMediaKind(rawMediaType) : PhiMediaKind.Image,
    presentationFlags: readNumber(raw.presentationFlags) ?? null,
    pageSize: readNumber(raw.pageSize) ?? 20,
    minColumnWidth: normalizePhiMediaPickerMinColumnWidth(raw.minColumnWidth),
    showSearchBar: readBoolean(raw.showSearchBar) ?? true,
    showFolderFilter: readBoolean(raw.showFolderFilter) ?? true,
    showPagination: readBoolean(raw.showPagination) ?? true,
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
    dataSource: PHI_MEDIA_PICKER_DATA_SOURCE,
  };
}

export function parsePhiCmsMediaPickerWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsMediaPickerWidgetConfig {
  return normalizePhiCmsMediaPickerWidgetConfig(config);
}

export const PHI_MEDIA_PICKER_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("media-picker"),
  typeKey: "media-picker",
  title: "Mediathek",
  description: "Button-based media picker with search, read-only folder context, thumbnails, and pagination.",
  category: "media",
  iconFamily: "content",
  runtimeSignals: {
    emits: [
      { id: "kind", action: "change", valueType: "string" },
      { id: "presentationFlags", action: "change", valueType: "number[]" },
      { id: "query", action: "change", valueType: "string" },
      { id: "path", action: "change", valueType: "path" },
      { id: "reload", action: "activate", valueType: "none" },
      { id: "pagination", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pagination },
      { id: "selection", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.mediaAssetSelection },
    ],
  },
  fields: [
    { key: "mediaType", type: "string", label: "Media Type" },
    { key: "presentationFlags", type: "number", label: "PresentationFlags", min: 0, precision: 0 },
    { key: "pageSize", type: "number", label: "Page Size", min: 1, precision: 0 },
    {
      key: "minColumnWidth",
      type: "number",
      label: "Tile Size",
      min: PHI_MEDIA_PICKER_MIN_COLUMN_WIDTH,
      max: PHI_MEDIA_PICKER_MAX_COLUMN_WIDTH,
      precision: 0,
    },
    { key: "showSearchBar", type: "boolean", label: "Show Search Bar" },
    { key: "showFolderFilter", type: "boolean", label: "Show Folder Filter" },
    { key: "showPagination", type: "boolean", label: "Show Pagination" },
  ],
  defaultConfig: {
    mediaType: "image",
    presentationFlags: null,
    pageSize: 20,
    minColumnWidth: PHI_MEDIA_PICKER_DEFAULT_COLUMN_WIDTH,
    showSearchBar: true,
    showFolderFilter: true,
    showPagination: true,
    dataSource: PHI_MEDIA_PICKER_DATA_SOURCE,
  },
  parseConfig: parsePhiCmsMediaPickerWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsMediaPickerWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"

  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_MEDIA_PICKER_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.MediaPicker;
