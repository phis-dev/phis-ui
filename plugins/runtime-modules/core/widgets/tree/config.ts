import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { isPhiRuntimeDataProviderKey } from "../../../../../types/runtime-data-provider";
import type { PhiCmsConfigField, PhiCmsWidgetPlugin } from "../../../../../types/cms-plugins";
import type {
  PhiTreeActionDefinition,
  PhiTreeBindingToolDefinition,
  PhiTreeWidgetConfig,
} from "../../../../../types/tree-widget";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import { readPhiLengthValue } from "../../../../../types/length";
import { resolvePhiRuntimeConditionControllerRequirements } from "../../../../../types/runtime-condition";
import { PHI_CONTROL_SIZE_FIELD, parsePhiControlPresentationConfig } from "../../../../../components/widgets/config/control-signal-config";
import { readBoolean, readNumber, readString } from "../../../../../components/widgets/config/parser-primitives";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readActions(value: unknown): PhiTreeActionDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const key = readString(entry.key);
    const label = readString(entry.label);
    if (!key || !label) return [];
    const rawConfirm = isRecord(entry.confirm) ? entry.confirm : null;
    const confirmTitle = readString(rawConfirm?.title);
    return [{
      key,
      label,
      execution: entry.execution === "signal" || entry.execution === "link" ? entry.execution : "provider",
      icon: readString(entry.icon),
      display: entry.display === "icon" || entry.display === "icon-label" ? entry.display : "label",
      mode: entry.mode === "primary" || entry.mode === "danger" ? entry.mode : "normal",
      href: readString(entry.href),
      hrefPath: readString(entry.hrefPath),
      newTab: readBoolean(entry.newTab),
      confirm: confirmTitle ? {
        title: confirmTitle,
        description: readString(rawConfirm?.description),
        okText: readString(rawConfirm?.okText),
        cancelText: readString(rawConfirm?.cancelText),
      } : undefined,
    }];
  });
}

function readBindingTools(value: unknown): PhiTreeBindingToolDefinition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const key = readString(entry.key);
    if (!key) return [];
    return [{
      key,
      label: readString(entry.label),
      placeholder: readString(entry.placeholder),
      control: entry.control === "autocomplete" ? "autocomplete" : "select",
      width: readPhiLengthValue(entry.width) ?? undefined,
    }];
  });
}

function readSource(value: unknown): PhiTreeWidgetConfig["source"] {
  if (!isRecord(value) || !isPhiRuntimeDataProviderKey(value.providerKey) || !readString(value.resourceKey)) return null;
  return {
    providerKey: value.providerKey,
    resourceKey: readString(value.resourceKey)!,
    params: isRecord(value.params) ? value.params : undefined,
  };
}

export function parsePhiTreeWidgetConfig(raw: Record<string, unknown>): PhiTreeWidgetConfig {
  const presentation = isRecord(raw.presentation) ? raw.presentation : {};
  const row = isRecord(presentation.row) ? presentation.row : {};
  const node = isRecord(presentation.node) ? presentation.node : {};
  const titleEditor = isRecord(node.titleEditor) ? node.titleEditor : {};
  const iconEditor = isRecord(node.iconEditor) ? node.iconEditor : {};
  const features = isRecord(raw.features) ? raw.features : {};
  const search = isRecord(features.search) ? features.search : {};
  const selection = isRecord(features.selection) ? features.selection : {};
  const checking = isRecord(features.checking) ? features.checking : {};
  const expansion = isRecord(features.expansion) ? features.expansion : {};
  const editing = isRecord(features.editing) ? features.editing : {};
  const tools = isRecord(features.tools) ? features.tools : {};
  const actions = isRecord(features.actions) ? features.actions : {};
  const dnd = isRecord(features.dnd) ? features.dnd : {};
  const initialQuery = isRecord(raw.initialQuery) ? raw.initialQuery : {};
  return {
    presentation: {
      ...parsePhiControlPresentationConfig(presentation),
      title: readString(presentation.title),
      description: readString(presentation.description),
      width: readPhiLengthValue(presentation.width) ?? undefined,
      minWidth: readPhiLengthValue(presentation.minWidth) ?? undefined,
      maxWidth: readPhiLengthValue(presentation.maxWidth) ?? undefined,
      bordered: readBoolean(presentation.bordered),
      blockNode: readBoolean(presentation.blockNode),
      showIcon: readBoolean(presentation.showIcon),
      showLine: readBoolean(presentation.showLine),
      virtual: readBoolean(presentation.virtual),
      row: { striped: readBoolean(row.striped) },
      node: {
        titleFieldKey: readString(node.titleFieldKey) ?? "title",
        descriptionFieldKey: readString(node.descriptionFieldKey),
        iconFieldKey: readString(node.iconFieldKey),
        titleEditor: {
          enabled: readBoolean(titleEditor.enabled),
          variant: titleEditor.variant === "outlined" || titleEditor.variant === "borderless" ||
            titleEditor.variant === "filled" ? titleEditor.variant : "underlined",
        },
        iconEditor: { enabled: readBoolean(iconEditor.enabled) },
      },
    },
    features: {
      search: {
        enabled: readBoolean(search.enabled),
        placeholder: readString(search.placeholder),
        debounceMs: readNumber(search.debounceMs),
      },
      selection: { mode: selection.mode === "none" || selection.mode === "multiple" ? selection.mode : "single" },
      checking: { enabled: readBoolean(checking.enabled), strict: readBoolean(checking.strict) },
      expansion: {
        defaultExpandAll: readBoolean(expansion.defaultExpandAll),
        defaultExpandedNodeIdentities: Array.isArray(expansion.defaultExpandedNodeIdentities)
          ? expansion.defaultExpandedNodeIdentities.filter((value): value is string | number => typeof value === "string" || typeof value === "number")
          : [],
      },
      editing: { enabled: readBoolean(editing.enabled) },
      tools: {
        mode: tools.mode === "external" ? "external" : "self-contained",
        bindingFields: readBindingTools(tools.bindingFields),
        reset: readBoolean(tools.reset),
        reload: readBoolean(tools.reload),
      },
      actions: {
        toolbar: readActions(actions.toolbar),
        node: readActions(actions.node),
        selection: readActions(actions.selection),
      },
      dnd: {
        mode: dnd.mode === "source" || dnd.mode === "reorder" || dnd.mode === "source-reorder" ? dnd.mode : "none",
        payloadType: typeof dnd.payloadType === "string" && dnd.payloadType.includes("/")
          ? dnd.payloadType as `${string}/${string}`
          : undefined,
      },
    },
    initialQuery: { search: readString(initialQuery.search) },
    source: readSource(raw.source),
    signalRoutes: readPhiSignalRouteSet(raw.signalRoutes),
  };
}

const ACTION_FIELDS: PhiCmsConfigField[] = [
  { key: "key", type: "string", label: "Key", required: true },
  { key: "execution", type: "choice", label: "Execution", options: [
    { value: "provider", label: "Provider" }, { value: "signal", label: "Signal" }, { value: "link", label: "Link" },
  ] },
  { key: "label", type: "string", label: "Label", required: true },
  { key: "icon", type: "icon", label: "Icon" },
  { key: "display", type: "choice", label: "Display", options: [
    { value: "icon", label: "Icon" }, { value: "label", label: "Label" }, { value: "icon-label", label: "Icon and label" },
  ] },
  { key: "mode", type: "choice", label: "Mode", options: [
    { value: "normal", label: "Normal" }, { value: "primary", label: "Primary" }, { value: "danger", label: "Danger" },
  ] },
  { key: "confirm.title", type: "string", label: "Confirm title" },
  { key: "confirm.description", type: "string", label: "Confirm description" },
];

export const PHI_TREE_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("tree"),
  typeKey: "tree",
  title: "Tree",
  description: "Provider-backed hierarchical data Tree with declarative nodes, tools, editors, and DnD.",
  category: "data",
  tags: ["tree", "data", "provider"],
  icon: "antd:apartment",
  iconFamily: "data",
  slotSizePolicy: "intrinsic",
  requiredRuntimeControllers: ({ config }) => resolvePhiRuntimeConditionControllerRequirements(config.signalRoutes),
  runtimeSignals: {
    emits: [
      { id: "selectionChange", action: "change", valueType: "string[]" },
      { id: "checkingChange", action: "change", valueType: "string[]" },
      { id: "expansionChange", action: "change", valueType: "string[]" },
      { id: "actionActivate", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.treeAction },
      { id: "bindingParamsChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.treeBindingParams },
      { id: "stateChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.treeState },
      { id: "mutationChange", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.treeMutation },
    ],
    listens: [
      { id: "searchChange", channel: "search", action: "change", valueType: "string" },
      { id: "searchClear", channel: "search", action: "clear", valueType: "none" },
      { id: "reload", channel: "reload", action: "activate", valueType: "none" },
      { id: "bindingParamsChange", channel: "bindingParams", action: "change", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.treeBindingParams },
      { id: "selectionChange", channel: "selection", action: "change", valueType: "string[]" },
      { id: "checkingChange", channel: "checking", action: "change", valueType: "string[]" },
      { id: "expansionChange", channel: "expansion", action: "change", valueType: "string[]" },
      { id: "actionActivate", channel: "action", action: "activate", valueType: "json", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.treeAction },
    ],
  },
  fields: [
    { key: "source", type: "data-provider", providerKind: "tree", label: "Tree Provider" },
    { key: "presentation.title", type: "string", label: "Title" },
    { key: "presentation.description", type: "string", label: "Description" },
    { key: "presentation.width", type: "length", label: "Width" },
    { key: "presentation.minWidth", type: "length", label: "Minimum width" },
    { key: "presentation.maxWidth", type: "length", label: "Maximum width" },
    { key: "presentation.bordered", type: "boolean", label: "Bordered" },
    { key: "presentation.blockNode", type: "boolean", label: "Block nodes" },
    { key: "presentation.showIcon", type: "boolean", label: "Show icons" },
    { key: "presentation.showLine", type: "boolean", label: "Show lines" },
    { key: "presentation.virtual", type: "boolean", label: "Virtual rendering" },
    { key: "presentation.row.striped", type: "boolean", label: "Striped rows" },
    { ...PHI_CONTROL_SIZE_FIELD, key: "presentation.controlSize" },
    { key: "presentation.node.titleFieldKey", type: "string", label: "Title field", required: true },
    { key: "presentation.node.descriptionFieldKey", type: "string", label: "Description field" },
    { key: "presentation.node.iconFieldKey", type: "string", label: "Icon field" },
    { key: "presentation.node.titleEditor.enabled", type: "boolean", label: "Editable title" },
    { key: "presentation.node.iconEditor.enabled", type: "boolean", label: "Editable icon" },
    { key: "features.search.enabled", type: "boolean", label: "Search" },
    { key: "features.search.placeholder", type: "string", label: "Search placeholder" },
    { key: "features.search.debounceMs", type: "number", label: "Search debounce", min: 0, precision: 0 },
    { key: "features.selection.mode", type: "choice", label: "Selection", options: [
      { value: "none", label: "None" }, { value: "single", label: "Single" }, { value: "multiple", label: "Multiple" },
    ] },
    { key: "features.checking.enabled", type: "boolean", label: "Checking" },
    { key: "features.checking.strict", type: "boolean", label: "Strict checking" },
    { key: "features.expansion.defaultExpandAll", type: "boolean", label: "Expand all initially" },
    { key: "features.editing.enabled", type: "boolean", label: "Editing" },
    { key: "features.tools.mode", type: "choice", label: "Tools", options: [
      { value: "self-contained", label: "Self-contained" }, { value: "external", label: "External" },
    ] },
    { key: "features.tools.bindingFields", type: "collection", label: "Binding tools", itemKeyField: "key", itemLabelField: "key",
      defaultItem: { key: "binding", label: "Binding", control: "select" }, itemFields: [
        { key: "key", type: "string", label: "Provider binding field", required: true },
        { key: "label", type: "string", label: "Label" },
        { key: "placeholder", type: "string", label: "Placeholder" },
        { key: "width", type: "length", label: "Width", min: 0 },
    ] },
    { key: "features.tools.reset", type: "boolean", label: "Reset" },
    { key: "features.tools.reload", type: "boolean", label: "Reload" },
    { key: "features.dnd.mode", type: "choice", label: "Drag and drop", options: [
      { value: "none", label: "None" }, { value: "source", label: "Source" },
      { value: "reorder", label: "Reorder" }, { value: "source-reorder", label: "Source and reorder" },
    ] },
    { key: "features.actions.toolbar", type: "collection", label: "Toolbar actions", itemKeyField: "key", itemLabelField: "label", defaultItem: { key: "action", label: "Action" }, itemFields: ACTION_FIELDS },
    { key: "features.actions.node", type: "collection", label: "Node actions", itemKeyField: "key", itemLabelField: "label", defaultItem: { key: "action", label: "Action" }, itemFields: ACTION_FIELDS },
  ],
  defaultConfig: {
    presentation: { blockNode: true, showIcon: true, bordered: false, row: { striped: false }, node: { titleFieldKey: "title" } },
    features: { selection: { mode: "single" }, expansion: { defaultExpandAll: false }, tools: { mode: "self-contained" }, dnd: { mode: "none" } },
    source: null,
    signalRoutes: null,
  },
  parseConfig: parsePhiTreeWidgetConfig,
} satisfies Pick<PhiCmsWidgetPlugin<PhiTreeWidgetConfig>,
  "kind" | "pluginKey" | "typeKey" | "title" | "description" | "category" | "tags" | "icon" | "iconFamily" |
  "slotSizePolicy" | "requiredRuntimeControllers" | "runtimeSignals" | "fields" | "defaultConfig" | "parseConfig">;

export const PHI_TREE_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Tree;
