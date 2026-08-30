import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiControlSize } from "../../../../../types/control";
import type {
  PhiCollectionProviderDataSource,
  PhiCollectionProviderQuery,
  PhiCollectionProviderQueryValue,
} from "../../../../../types/collection-provider";
import type { PhiCmsWidgetPlugin } from "../../../../../types/cms-plugins";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet, type PhiSignalRouteSet } from "../../../../../types/signals";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import { readPhiLengthValue, type PhiCssLength } from "../../../../../types/length";
import { readBoolean, readNumber, readString, type PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsCollectionViewMode = "grid" | "masonry" | "stack";
export type PhiCmsCollectionFilterControl = "select" | "multi-select" | "cascader";

export type PhiCmsCollectionFilterPresentation = {
  key: string;
  control: PhiCmsCollectionFilterControl;
  placeholder?: string;
  width?: PhiCssLength;
  minWidth?: PhiCssLength;
  actions?: PhiCmsCollectionToolbarActionPresentation[];
};

export type PhiCmsCollectionToolbarActionPresentation = {
  key: string;
  label?: string;
  description?: string;
  icon?: string;
  display?: "icon" | "label" | "icon-label";
  mode?: "normal" | "primary" | "danger";
};

export type PhiCmsCollectionViewWidgetConfig = PhiCmsWidgetConfigBase & {
  presentation: {
    title?: string;
    description?: string;
    mode: PhiCmsCollectionViewMode;
    gap?: PhiCssLength;
    minColumnWidth?: PhiCssLength;
    emptyDescription?: string;
    controlSize?: PhiControlSize;
    labels?: Record<string, unknown>;
  };
  features: {
    tools: {
      mode: "self-contained" | "external";
      reload?: boolean;
      reset?: boolean;
    };
    search?: {
      enabled: boolean;
      placeholder?: string;
      minWidth?: PhiCssLength;
    };
    filters?: PhiCmsCollectionFilterPresentation[];
    actions?: {
      toolbar?: PhiCmsCollectionToolbarActionPresentation[];
    };
    pagination?: {
      enabled: boolean;
      pageSize?: number;
      showSizeChanger?: boolean;
      simple?: boolean;
    };
  };
  initialQuery?: PhiCollectionProviderQuery;
  source: PhiCollectionProviderDataSource | null;
  signalRoutes?: PhiSignalRouteSet | null;
};

export type PhiCmsAssetPreviewGridWidgetConfig = PhiCmsWidgetConfigBase & {
  emptyDescription?: string;
};

export function normalizePhiCmsAssetPreviewGridWidgetConfig(config: unknown): PhiCmsAssetPreviewGridWidgetConfig {
  if (!config || typeof config !== "object" || Array.isArray(config)) return { emptyDescription: undefined };
  return { emptyDescription: readString((config as Record<string, unknown>).emptyDescription) };
}

export function parsePhiCmsAssetPreviewGridWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsAssetPreviewGridWidgetConfig {
  return normalizePhiCmsAssetPreviewGridWidgetConfig(config);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readMode(value: unknown): PhiCmsCollectionViewMode {
  return value === "masonry" || value === "stack" ? value : "grid";
}

function readControlSize(value: unknown): PhiControlSize | undefined {
  return value === "small" || value === "medium" || value === "large" ? value : undefined;
}

function readSource(value: unknown): PhiCollectionProviderDataSource | null {
  if (!isRecord(value)) return null;
  const resourceKey = readString(value.resourceKey);
  if (!isPhiRuntimeDataProviderKey(value.providerKey) || !resourceKey) return null;
  return {
    providerKey: value.providerKey,
    resourceKey,
    scopeKey: readString(value.scopeKey),
    params: isRecord(value.params) ? value.params : undefined,
  };
}

function readFilters(value: unknown): PhiCmsCollectionFilterPresentation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const key = readString(entry.key);
    const control = entry.control === "multi-select" || entry.control === "cascader" ? entry.control : "select";
    return key ? [{
      key,
      control,
      placeholder: readString(entry.placeholder),
      width: readPhiLengthValue(entry.width) ?? undefined,
      minWidth: readPhiLengthValue(entry.minWidth) ?? undefined,
      actions: readToolbarActions(entry.actions),
    }] : [];
  });
}

function readToolbarActions(value: unknown): PhiCmsCollectionToolbarActionPresentation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const key = readString(entry.key);
    if (!key) return [];
    return [{
      key,
      label: readString(entry.label),
      description: readString(entry.description),
      icon: readString(entry.icon),
      display: entry.display === "label" || entry.display === "icon-label" ? entry.display : "icon",
      mode: entry.mode === "primary" || entry.mode === "danger" ? entry.mode : "normal",
    }];
  });
}

function readInitialQuery(value: unknown): PhiCollectionProviderQuery | undefined {
  if (!isRecord(value)) return undefined;
  const page = readNumber(value.page);
  const pageSize = readNumber(value.pageSize);
  return {
    page: page && page > 0 ? page : undefined,
    pageSize: pageSize && pageSize > 0 ? pageSize : undefined,
    search: readString(value.search),
    sortKey: readString(value.sortKey),
    sortOrder: value.sortOrder === "ascend" ? "ascend" : value.sortOrder === "descend" ? "descend" : undefined,
    filters: isRecord(value.filters)
      ? Object.fromEntries(Object.entries(value.filters).filter((entry): entry is [string, PhiCollectionProviderQueryValue] => {
          const filterValue = entry[1];
          return filterValue == null || typeof filterValue === "string" || typeof filterValue === "number" ||
            typeof filterValue === "boolean" ||
            (Array.isArray(filterValue) && filterValue.every((item) => typeof item === "string" || typeof item === "number"));
        }))
      : undefined,
  };
}

export function normalizePhiCmsCollectionViewWidgetConfig(config: unknown): PhiCmsCollectionViewWidgetConfig {
  const raw = isRecord(config) ? config : {};
  const presentation = isRecord(raw.presentation) ? raw.presentation : {};
  const features = isRecord(raw.features) ? raw.features : {};
  const tools = isRecord(features.tools) ? features.tools : {};
  const search = isRecord(features.search) ? features.search : null;
  const actions = isRecord(features.actions) ? features.actions : {};
  const pagination = isRecord(features.pagination) ? features.pagination : null;
  return {
    presentation: {
      title: readString(presentation.title),
      description: readString(presentation.description),
      mode: readMode(presentation.mode),
      gap: readPhiLengthValue(presentation.gap) ?? undefined,
      minColumnWidth: readPhiLengthValue(presentation.minColumnWidth) ?? undefined,
      emptyDescription: readString(presentation.emptyDescription),
      controlSize: readControlSize(presentation.controlSize) ?? "small",
      labels: isRecord(presentation.labels) ? presentation.labels : undefined,
    },
    features: {
      tools: {
        mode: tools.mode === "external" ? "external" : "self-contained",
        reload: readBoolean(tools.reload) ?? false,
        reset: readBoolean(tools.reset) ?? false,
      },
      search: search ? {
        enabled: readBoolean(search.enabled) ?? true,
        placeholder: readString(search.placeholder),
        minWidth: readPhiLengthValue(search.minWidth) ?? undefined,
      } : undefined,
      filters: readFilters(features.filters),
      actions: { toolbar: readToolbarActions(actions.toolbar) },
      pagination: pagination ? {
        enabled: readBoolean(pagination.enabled) ?? true,
        pageSize: readNumber(pagination.pageSize),
        showSizeChanger: readBoolean(pagination.showSizeChanger) ?? false,
        simple: readBoolean(pagination.simple) ?? true,
      } : undefined,
    },
    initialQuery: readInitialQuery(raw.initialQuery),
    source: readSource(raw.source),
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
  };
}

export function parsePhiCmsCollectionViewWidgetConfig(
  config: Record<string, unknown>,
): PhiCmsCollectionViewWidgetConfig {
  return normalizePhiCmsCollectionViewWidgetConfig(config);
}

export const PHI_COLLECTION_VIEW_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("collection-view"),
  typeKey: "collection-view",
  title: "Collection View",
  description: "Provider-backed visual collection with generic tools and pagination.",
  category: "data",
  iconFamily: "content",
  slotSizePolicy: "fill-inline",
  runtimeSignals: {
    emits: [
      { id: "selection", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.mediaAssetSelection },
      { id: "actionActivate", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.collectionAction },
    ],
    listens: [
      { id: "reload", channel: "reload", action: "activate", valueType: "none" },
    ],
  },
  fields: [
    { key: "source", type: "data-provider", providerKind: "collection", label: "Collection Provider" },
    { key: "presentation.title", type: "string", label: "Title" },
    { key: "presentation.description", type: "string", label: "Description" },
    {
      key: "presentation.mode",
      type: "choice",
      label: "Mode",
      options: [
        { value: "grid", label: "Grid" },
        { value: "masonry", label: "Masonry" },
        { value: "stack", label: "Stack" },
      ],
    },
    { key: "presentation.gap", type: "length", label: "Gap", min: 0 },
    { key: "presentation.minColumnWidth", type: "length", label: "Min Column Width", min: 0 },
    { key: "presentation.emptyDescription", type: "string", label: "Empty Description" },
    {
      key: "presentation.controlSize",
      type: "choice",
      label: "Control Size",
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
      ],
    },
    {
      key: "features.tools.mode",
      type: "choice",
      label: "Tools",
      options: [
        { value: "self-contained", label: "Self-contained" },
        { value: "external", label: "External" },
      ],
    },
    { key: "features.tools.reset", type: "boolean", label: "Reset Tool" },
    { key: "features.tools.reload", type: "boolean", label: "Reload Tool" },
    { key: "features.search.enabled", type: "boolean", label: "Search" },
    { key: "features.search.placeholder", type: "string", label: "Search Placeholder" },
    { key: "features.search.minWidth", type: "length", label: "Search Minimum Width", min: 0 },
    {
      key: "features.filters",
      type: "collection",
      label: "Filters",
      itemKeyField: "key",
      itemLabelField: "key",
      addLabel: "Add filter",
      emptyLabel: "No filters",
      defaultItem: { key: "filter", control: "select" },
      itemFields: [
        { key: "key", type: "string", label: "Provider Filter Key", required: true },
        {
          key: "control",
          type: "choice",
          label: "Control",
          options: [
            { value: "select", label: "Select" },
            { value: "multi-select", label: "Multi Select" },
            { value: "cascader", label: "Cascader" },
          ],
        },
        { key: "placeholder", type: "string", label: "Placeholder" },
        { key: "width", type: "length", label: "Width", min: 0 },
        { key: "minWidth", type: "length", label: "Minimum Width", min: 0 },
        {
          key: "actions",
          type: "collection",
          label: "Companion Actions",
          itemKeyField: "key",
          itemLabelField: "label",
          addLabel: "Add action",
          emptyLabel: "No actions",
          defaultItem: { key: "action", display: "icon", mode: "normal" },
          itemFields: [
            { key: "key", type: "string", label: "Provider Action Key", required: true },
            { key: "label", type: "string", label: "Label" },
            { key: "description", type: "string", label: "Description" },
            { key: "icon", type: "icon", label: "Icon" },
            {
              key: "display",
              type: "choice",
              label: "Display",
              options: [
                { value: "icon", label: "Icon" },
                { value: "label", label: "Label" },
                { value: "icon-label", label: "Icon and Label" },
              ],
            },
            {
              key: "mode",
              type: "choice",
              label: "Mode",
              options: [
                { value: "normal", label: "Normal" },
                { value: "primary", label: "Primary" },
                { value: "danger", label: "Danger" },
              ],
            },
          ],
        },
      ],
    },
    {
      key: "features.actions.toolbar",
      type: "collection",
      label: "Toolbar Actions",
      itemKeyField: "key",
      itemLabelField: "label",
      addLabel: "Add action",
      emptyLabel: "No actions",
      defaultItem: { key: "action", display: "icon", mode: "normal" },
      itemFields: [
        { key: "key", type: "string", label: "Provider Action Key", required: true },
        { key: "label", type: "string", label: "Label" },
        { key: "description", type: "string", label: "Description" },
        { key: "icon", type: "icon", label: "Icon" },
        {
          key: "display",
          type: "choice",
          label: "Display",
          options: [
            { value: "icon", label: "Icon" },
            { value: "label", label: "Label" },
            { value: "icon-label", label: "Icon and Label" },
          ],
        },
        {
          key: "mode",
          type: "choice",
          label: "Mode",
          options: [
            { value: "normal", label: "Normal" },
            { value: "primary", label: "Primary" },
            { value: "danger", label: "Danger" },
          ],
        },
      ],
    },
    { key: "features.pagination.enabled", type: "boolean", label: "Pagination" },
    { key: "features.pagination.pageSize", type: "number", label: "Page Size", min: 1, precision: 0 },
    { key: "features.pagination.simple", type: "boolean", label: "Simple Pagination" },
    { key: "features.pagination.showSizeChanger", type: "boolean", label: "Page Size Selector" },
  ],
  defaultConfig: {
    presentation: { mode: "grid", controlSize: "small" },
    features: { tools: { mode: "self-contained", reload: false, reset: false } },
    source: null,
    signalRoutes: null,
  },
  parseConfig: parsePhiCmsCollectionViewWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsCollectionViewWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_COLLECTION_VIEW_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.CollectionView;
