import type {
  PhiRenderableBlockSize,
  PhiRenderableBlockVisibility,
} from "./renderable-block";
import type { PhiCmsGridLayoutSlotPlacementConfig } from "./cms-config";
import { readPhiCmsInstanceId, type PhiCmsInstanceId } from "./cms-instance-id";
import { isPhiNpmPackageName } from "../constants/package";
import { createPhiModuleScopedKey, isPhiModuleScopedKey } from "../constants/runtime-module-ownership";

export { PHI_SHARED_PACKAGE_NAME } from "../constants/package";

export const PHI_SIGNAL_SCOPES = [
  "widget",
  "layout",
  "region",
  "page",
  "area",
  "site",
] as const;
export type PhiSignalScope = (typeof PHI_SIGNAL_SCOPES)[number];

export type PhiSignalRuntimeContext = {
  siteKey?: string | null;
  area?: string | null;
  pageKey?: string | null;
  regionKey?: string | null;
  slotKey?: string | null;
};

export const PHI_SIGNAL_CHANNELS = [
  "text",
  "path",
  "select",
  "toggle",
  "number",
  "color",
  "command",
  "visibility",
  "enabled",
  "background",
  "border",
  "selection",
  "stack",
  "layout",
  "content",
  "style",
  "meta",
  "drag",
  "drop",
  "flush",
  "inspector",
] as const;
export type PhiSignalChannel = string;

export const PHI_SIGNAL_ACTIONS = [
  "activate",
  "change",
  "toggle",
  "start",
  "stop",
  "clear",
  "open",
  "close",
  "reload",
  "flush",
  "filter",
  "drop",
] as const;
export type PhiSignalAction = (typeof PHI_SIGNAL_ACTIONS)[number];

export const PHI_SIGNAL_VALUE_TYPES = [
  "none",
  "boolean",
  "string",
  "number",
  "date",
  "time",
  "enum",
  "color",
  "path",
  "length",
  "size",
  "image",
  "icon",
  "string[]",
  "number[]",
  "enum[]",
  "json",
] as const;
export type PhiSignalValueType = (typeof PHI_SIGNAL_VALUE_TYPES)[number];
export const PHI_SIGNAL_VALUE_SCHEMA_NAMESPACE = "signals";

export type PhiSignalValueSchema = `${string}/${typeof PHI_SIGNAL_VALUE_SCHEMA_NAMESPACE}/${string}`;

export const PHI_SIGNAL_VALUE_SCHEMA_SEPARATOR = "/";

export function createPhiSignalValueSchema(
  packageName: string,
  schemaKey: string,
): PhiSignalValueSchema {
  const normalizedPackageName = packageName.trim();
  const normalizedSchemaKey = schemaKey.trim();
  if (
    !isPhiNpmPackageName(normalizedPackageName) ||
    !isPhiSignalAddressSegment(normalizedSchemaKey)
  ) {
    throw new Error(`Invalid Phi signal value schema parts: ${normalizedPackageName}/${normalizedSchemaKey}.`);
  }

  return `${normalizedPackageName}/${PHI_SIGNAL_VALUE_SCHEMA_NAMESPACE}${PHI_SIGNAL_VALUE_SCHEMA_SEPARATOR}${normalizedSchemaKey}` as PhiSignalValueSchema;
}

export function createPhiSharedSignalValueSchema(schemaKey: string): PhiSignalValueSchema {
  return createPhiModuleScopedKey(PHI_SIGNAL_VALUE_SCHEMA_NAMESPACE, schemaKey) as PhiSignalValueSchema;
}

export const PHI_SIGNAL_VALUE_SCHEMAS = {
  backgroundConfig: createPhiSharedSignalValueSchema("background-config"),
  borderConfig: createPhiSharedSignalValueSchema("border-config"),
  brandTheme: createPhiSharedSignalValueSchema("brand-theme"),
  builderChrome: createPhiSharedSignalValueSchema("builder-chrome"),
  builderInspector: createPhiSharedSignalValueSchema("builder-inspector"),
  builderLayout: createPhiSharedSignalValueSchema("builder-layout"),
  builderNavigation: createPhiSharedSignalValueSchema("builder-navigation"),
  builderNodeSelection: createPhiSharedSignalValueSchema("builder-node-selection"),
  revisionsDraftStatus: createPhiSharedSignalValueSchema("revisions-draft-status"),
  collectionAction: createPhiSharedSignalValueSchema("collection-action"),
  dragDrop: createPhiSharedSignalValueSchema("drag-drop"),
  formError: createPhiSharedSignalValueSchema("form-error"),
  formField: createPhiSharedSignalValueSchema("form-field"),
  formResult: createPhiSharedSignalValueSchema("form-result"),
  formSubmit: createPhiSharedSignalValueSchema("form-submit"),
  formTouched: createPhiSharedSignalValueSchema("form-touched"),
  formValidity: createPhiSharedSignalValueSchema("form-validity"),
  formValues: createPhiSharedSignalValueSchema("form-values"),
  formState: createPhiSharedSignalValueSchema("form-state"),
  markdownToc: createPhiSharedSignalValueSchema("markdown-toc"),
  localizationWorkspace: createPhiSharedSignalValueSchema("localization-workspace"),
  mediaAssetSelection: createPhiSharedSignalValueSchema("media-asset-selection"),
  message: createPhiSharedSignalValueSchema("message"),
  notification: createPhiSharedSignalValueSchema("notification"),
  overlayCloseRequest: createPhiSharedSignalValueSchema("overlay-close-request"),
  pageMeta: createPhiSharedSignalValueSchema("page-meta"),
  pagination: createPhiSharedSignalValueSchema("pagination"),
  runtimeConditionState: createPhiSharedSignalValueSchema("runtime-condition-state"),
  runtimeTheme: createPhiSharedSignalValueSchema("runtime-theme"),
  stackMeta: createPhiSharedSignalValueSchema("stack-meta"),
  tableAction: createPhiSharedSignalValueSchema("table-action"),
  tableBindingParams: createPhiSharedSignalValueSchema("table-binding-params"),
  tableColumnOrder: createPhiSharedSignalValueSchema("table-column-order"),
  tableExpansion: createPhiSharedSignalValueSchema("table-expansion"),
  tableFilters: createPhiSharedSignalValueSchema("table-filters"),
  tableQuery: createPhiSharedSignalValueSchema("table-query"),
  tableSelection: createPhiSharedSignalValueSchema("table-selection"),
  tableState: createPhiSharedSignalValueSchema("table-state"),
  tableMutation: createPhiSharedSignalValueSchema("table-mutation"),
  treeAction: createPhiSharedSignalValueSchema("tree-action"),
  treeBindingParams: createPhiSharedSignalValueSchema("tree-binding-params"),
  treeState: createPhiSharedSignalValueSchema("tree-state"),
  treeMutation: createPhiSharedSignalValueSchema("tree-mutation"),
  temporalSelection: createPhiSharedSignalValueSchema("temporal-selection"),
} as const satisfies Record<string, PhiSignalValueSchema>;

export type PhiSignalValue =
  | boolean
  | string
  | number
  | string[]
  | number[]
  | PhiRenderableBlockSize
  | Record<string, unknown>
  | null;

export type PhiSignalMeta = {
  label?: string | null;
  checked?: boolean | null;
  sourceLabel?: string | null;
};

export type PhiSignalAddress =
  | `cms:${PhiCmsInstanceId}`
  | `cms:${PhiCmsInstanceId}:${string}`
  | `region:${string}`
  | `controller:${string}/${string}:${string}`;

export type PhiControllerSignalAddress = Extract<PhiSignalAddress, `controller:${string}`>;

export type PhiSignalSender = PhiSignalAddress | null;
export type PhiSignalReceiver = PhiSignalAddress | "broadcast" | null;

export type PhiSignalAddressFamily =
  | "cms"
  | "region";

function normalizePhiSignalAddressPart(value: string | number) {
  return String(value).trim();
}

function isPhiSignalAddressSegment(value: string) {
  return value.length > 0 && !value.includes("/") && !value.includes(":");
}

export function createPhiSignalAddress(
  family: PhiSignalAddressFamily,
  instanceIdOrKey: string | number,
): PhiSignalAddress {
  const instance = normalizePhiSignalAddressPart(instanceIdOrKey);
  if (family === "cms" && !readPhiCmsInstanceId(instance)) {
    throw new Error(`Invalid Phi CMS signal instance id: ${instance}.`);
  }
  if (family === "region" && !isPhiSignalAddressSegment(instance)) {
    throw new Error(`Invalid Phi Region signal key: ${instance}.`);
  }
  return `${family}:${instance}` as PhiSignalAddress;
}

export function createPhiSignalSubcontrolAddress(
  family: "cms",
  instanceIdOrKey: PhiCmsInstanceId,
  controlKey: string | number,
): PhiSignalAddress {
  const instance = normalizePhiSignalAddressPart(instanceIdOrKey);
  const control = normalizePhiSignalAddressPart(controlKey);
  if (!readPhiCmsInstanceId(instance) || !isPhiSignalAddressSegment(control)) {
    throw new Error(`Invalid Phi CMS subcontrol signal address parts: ${instance}:${control}.`);
  }
  return `${family}:${instance}:${control}` as PhiSignalAddress;
}

/**
 * A controller lives in the namespace of the module that owns it, so a plugin key is either a bare
 * package name or that package followed by `/modules/<module>/<namespace>`. Foreign packages use
 * either form; the grammar does not privilege first-party keys.
 */
function isPhiControllerPluginKey(value: string) {
  const marker = value.indexOf("/modules/");
  if (marker < 0) {
    return isPhiNpmPackageName(value);
  }
  const rest = value.slice(marker + "/modules/".length).split("/");
  return (
    isPhiNpmPackageName(value.slice(0, marker)) &&
    rest.length === 2 &&
    rest.every((part) => isPhiSignalAddressSegment(part))
  );
}

export function createPhiControllerSignalAddress(
  pluginKey: string | number,
  controllerKey: string | number,
  instanceKey: string | number,
): PhiControllerSignalAddress {
  const plugin = normalizePhiSignalAddressPart(pluginKey);
  const controller = normalizePhiSignalAddressPart(controllerKey);
  const instance = normalizePhiSignalAddressPart(instanceKey);
  if (
    !isPhiControllerPluginKey(plugin) ||
    !isPhiSignalAddressSegment(controller) ||
    !isPhiSignalAddressSegment(instance)
  ) {
    throw new Error(`Invalid Phi controller signal address parts: ${plugin}/${controller}:${instance}.`);
  }
  return `controller:${plugin}/${controller}:${instance}` as PhiControllerSignalAddress;
}

export function isPhiControllerSignalAddress(address: unknown): address is PhiControllerSignalAddress {
  if (typeof address !== "string") {
    return false;
  }
  if (!address.startsWith("controller:")) {
    return false;
  }

  const body = address.slice("controller:".length);
  const instanceSeparatorIndex = body.lastIndexOf(":");
  if (instanceSeparatorIndex <= 0 || instanceSeparatorIndex === body.length - 1) {
    return false;
  }

  const namespacedType = body.slice(0, instanceSeparatorIndex);
  const instanceKey = body.slice(instanceSeparatorIndex + 1);
  const controllerSeparatorIndex = namespacedType.lastIndexOf("/");
  if (controllerSeparatorIndex <= 0 || controllerSeparatorIndex === namespacedType.length - 1) {
    return false;
  }

  const pluginKey = namespacedType.slice(0, controllerSeparatorIndex);
  const controllerKey = namespacedType.slice(controllerSeparatorIndex + 1);
  return (
    isPhiControllerPluginKey(pluginKey) &&
    isPhiSignalAddressSegment(controllerKey) &&
    isPhiSignalAddressSegment(instanceKey)
  );
}

export function readPhiControllerSignalAddress(
  value: unknown,
): PhiControllerSignalAddress | undefined {
  return isPhiControllerSignalAddress(value) ? value.trim() as PhiControllerSignalAddress : undefined;
}

export function readPhiControllerSignalAddressParts(value: unknown): {
  pluginKey: string;
  controllerKey: string;
  instanceKey: string;
  type: `${string}/${string}`;
} | null {
  const address = readPhiControllerSignalAddress(value);
  if (!address) {
    return null;
  }
  const body = address.slice("controller:".length);
  const instanceSeparatorIndex = body.lastIndexOf(":");
  const namespacedType = body.slice(0, instanceSeparatorIndex);
  const instanceKey = body.slice(instanceSeparatorIndex + 1);
  const controllerSeparatorIndex = namespacedType.lastIndexOf("/");
  const pluginKey = namespacedType.slice(0, controllerSeparatorIndex);
  const controllerKey = namespacedType.slice(controllerSeparatorIndex + 1);
  return {
    pluginKey,
    controllerKey,
    instanceKey,
    type: `${pluginKey}/${controllerKey}`,
  };
}

export function isPhiSignalAddress(value: unknown): value is PhiSignalAddress {
  if (typeof value !== "string") {
    return false;
  }

  const address = value.trim();
  if (address.startsWith("cms:")) {
    const parts = address.slice("cms:".length).split(":");
    return (
      (parts.length === 1 || parts.length === 2) &&
      readPhiCmsInstanceId(parts[0]) != null &&
      (parts.length === 1 || isPhiSignalAddressSegment(parts[1]!))
    );
  }
  if (address.startsWith("region:")) {
    return isPhiSignalAddressSegment(address.slice("region:".length));
  }
  return isPhiControllerSignalAddress(address);
}

export function readPhiSignalAddress(value: unknown): PhiSignalAddress | undefined {
  return isPhiSignalAddress(value) ? (value.trim() as PhiSignalAddress) : undefined;
}

export function isPhiSignalReceiver(value: unknown): value is PhiSignalReceiver {
  return value === null || value === "broadcast" || isPhiSignalAddress(value);
}

export type PhiSignal = {
  originId: string;
  scope: PhiSignalScope;
  channel: PhiSignalChannel;
  action: PhiSignalAction;
  value: PhiSignalValue;
  valueType: PhiSignalValueType;
  valueSchema?: PhiSignalValueSchema | null;
  meta?: PhiSignalMeta | null;
  sender?: PhiSignalSender;
  receiver: PhiSignalReceiver;
  correlationId: string;
  timestamp: number;
};

export type PhiSignalFilter = {
  scopes?: readonly PhiSignalScope[];
  channels?: readonly PhiSignalChannel[];
  receiver?: PhiSignalReceiver;
  actions?: readonly PhiSignalAction[];
  valueSchemas?: readonly PhiSignalValueSchema[];
};

export type PhiSignalOutputCapability = {
  id: string;
  action: PhiSignalAction;
  valueType: PhiSignalValueType;
  valueSchema?: PhiSignalValueSchema | null;
  enumValues?: string[] | null;
  required?: boolean;
  target?: PhiSignalCapabilityTarget | null;
};

export type PhiSignalInputCapability = PhiSignalOutputCapability & {
  channel: PhiSignalChannel;
};

export type PhiSignalCapabilityTarget = "self" | "subcontrol" | "both";

export type PhiSignalRoute = {
  routeKey: string;
  capabilityId: string;
  scope: PhiSignalScope;
  channel: PhiSignalChannel;
  action: PhiSignalAction;
  valueType: PhiSignalValueType;
  valueSchema?: PhiSignalValueSchema | null;
  receiver: PhiSignalReceiver;
};

export type PhiSignalRouteSet = {
  emits?: PhiSignalRoute[] | null;
  listens?: PhiSignalRoute[] | null;
};

export type PhiSignalDragDropPayloadType = string;

export type PhiSignalDropMode = "before" | "after" | "child" | "replace" | "append" | "swap";

export type PhiSignalDragSourceMeta = {
  key: string;
  types: PhiSignalDragDropPayloadType[];
  title?: string | null;
  description?: string | null;
};

export type PhiSignalDropTargetMeta = {
  key: string;
  accepts: PhiSignalDragDropPayloadType[];
  modes?: PhiSignalDropMode[] | null;
  title?: string | null;
  description?: string | null;
};

export type PhiSignalDragDropPluginMeta = {
  sources?: PhiSignalDragSourceMeta[] | null;
  targets?: PhiSignalDropTargetMeta[] | null;
};

export type PhiSignalPluginMeta = {
  emits?: PhiSignalOutputCapability[] | null;
  listens?: PhiSignalInputCapability[] | null;
  dragDrop?: PhiSignalDragDropPluginMeta | null;
};

export function assertPhiSignalPluginMetaContract(
  runtimeSignals: PhiSignalPluginMeta | null | undefined,
  context = "runtimeSignals",
): void {
  if (!runtimeSignals) {
    return;
  }

  for (const capability of runtimeSignals.emits ?? []) {
    if (Object.prototype.hasOwnProperty.call(capability, "channel")) {
      throw new Error(`${context}: sender output "${capability.id}" must not declare a channel.`);
    }
    if (!isPhiSignalAction(capability.action)) {
      throw new Error(`${context}: sender output "${capability.id}" declares an invalid action.`);
    }
    if (!isPhiSignalValueType(capability.valueType)) {
      throw new Error(`${context}: sender output "${capability.id}" declares an invalid valueType.`);
    }
    if (capability.valueType === "json" && !isPhiSignalValueSchema(capability.valueSchema)) {
      throw new Error(`${context}: sender output "${capability.id}" with valueType "json" must declare valueSchema.`);
    }
    if (capability.target != null && !isPhiSignalCapabilityTarget(capability.target)) {
      throw new Error(`${context}: sender output "${capability.id}" declares an invalid target.`);
    }
  }

  const receiverInputKeys = new Set<string>();
  for (const capability of runtimeSignals.listens ?? []) {
    if (!isPhiSignalChannel(capability.channel)) {
      throw new Error(`${context}: receiver input "${capability.id}" declares an invalid channel.`);
    }
    if (!isPhiSignalAction(capability.action)) {
      throw new Error(`${context}: receiver input "${capability.id}" declares an invalid action.`);
    }
    if (!isPhiSignalValueType(capability.valueType)) {
      throw new Error(`${context}: receiver input "${capability.id}" declares an invalid valueType.`);
    }
    if (capability.valueType === "json" && !isPhiSignalValueSchema(capability.valueSchema)) {
      throw new Error(`${context}: receiver input "${capability.id}" with valueType "json" must declare valueSchema.`);
    }
    if (capability.target != null && !isPhiSignalCapabilityTarget(capability.target)) {
      throw new Error(`${context}: receiver input "${capability.id}" declares an invalid target.`);
    }

    const key = [
      capability.channel.trim(),
      capability.action,
      capability.valueType,
      capability.valueSchema ?? "",
    ].join("\u0000");
    if (receiverInputKeys.has(key)) {
      throw new Error(
        `${context}: duplicate receiver input signature "${capability.channel}/${capability.action}:${capability.valueType}".`,
      );
    }
    receiverInputKeys.add(key);
  }
}

export function isPhiSignalCapabilityTarget(value: unknown): value is PhiSignalCapabilityTarget {
  return value === "self" || value === "subcontrol" || value === "both";
}

export function isPhiSignalScope(value: unknown): value is PhiSignalScope {
  return typeof value === "string" && (PHI_SIGNAL_SCOPES as readonly string[]).includes(value);
}

export function isPhiSignalChannel(value: unknown): value is PhiSignalChannel {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPhiSignalAction(value: unknown): value is PhiSignalAction {
  return typeof value === "string" && (PHI_SIGNAL_ACTIONS as readonly string[]).includes(value);
}

export function isPhiSignalValueType(value: unknown): value is PhiSignalValueType {
  return typeof value === "string" && (PHI_SIGNAL_VALUE_TYPES as readonly string[]).includes(value);
}

/**
 * A value schema is named by the module that defines it, so loading that module is what brings the
 * shape into a Site. Third-party packages use the same grammar; nothing here privileges first-party
 * names.
 */
export function isPhiSignalValueSchema(value: unknown): value is PhiSignalValueSchema {
  return typeof value === "string"
    && isPhiModuleScopedKey(PHI_SIGNAL_VALUE_SCHEMA_NAMESPACE, value.trim());
}

export function readPhiSignalValueSchema(value: unknown): PhiSignalValueSchema | null {
  return isPhiSignalValueSchema(value) ? (value.trim() as PhiSignalValueSchema) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readPhiSignalRoute(value: unknown): PhiSignalRoute | null {
  if (!isRecord(value)) {
    return null;
  }
  const routeKey = typeof value.routeKey === "string" && value.routeKey.trim() ? value.routeKey.trim() : null;
  const capabilityId = typeof value.capabilityId === "string" && value.capabilityId.trim()
    ? value.capabilityId.trim()
    : null;
  if (!routeKey || !capabilityId) {
    return null;
  }

  if (!isPhiSignalScope(value.scope) ||
    !isPhiSignalChannel(value.channel) ||
    !isPhiSignalAction(value.action) ||
    !isPhiSignalValueType(value.valueType)
  ) {
    return null;
  }

  const valueType = value.valueType;
  const valueSchema = valueType === "json" ? readPhiSignalValueSchema(value.valueSchema) : null;
  if (valueType === "json" && !valueSchema) {
    return null;
  }
  if (!isPhiSignalReceiver(value.receiver)) {
    return null;
  }

  return {
    routeKey,
    capabilityId,
    scope: value.scope,
    channel: value.channel.trim(),
    action: value.action,
    valueType,
    valueSchema,
    receiver: value.receiver,
  };
}

function readPhiSignalRouteList(value: unknown): PhiSignalRoute[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const routes = value.map(readPhiSignalRoute);
  if (routes.some((route) => route == null)) {
    return null;
  }

  return routes.length > 0 ? routes as PhiSignalRoute[] : null;
}

export function readPhiSignalRouteSet(value: unknown): PhiSignalRouteSet | null {
  if (!isRecord(value)) {
    return null;
  }

  const emits = readPhiSignalRouteList(value.emits);
  const listens = readPhiSignalRouteList(value.listens);
  if (
    (value.emits != null && (!Array.isArray(value.emits) || (value.emits.length > 0 && !emits))) ||
    (value.listens != null && (!Array.isArray(value.listens) || (value.listens.length > 0 && !listens)))
  ) {
    return null;
  }
  const routeKeys = [...(emits ?? []), ...(listens ?? [])].map((route) => route.routeKey);
  if (new Set(routeKeys).size !== routeKeys.length) {
    return null;
  }
  return emits || listens ? { emits, listens } : null;
}

export function findPhiSignalRouteByKey(
  routes: readonly PhiSignalRoute[] | null | undefined,
  routeKey: string,
): PhiSignalRoute | null {
  return routes?.find((route) => route.routeKey === routeKey) ?? null;
}

export function findPhiSignalRoutesByCapabilityId(
  routes: readonly PhiSignalRoute[] | null | undefined,
  capabilityId: string,
): PhiSignalRoute[] {
  return routes?.filter((route) => route.capabilityId === capabilityId) ?? [];
}

export function createPhiSignalRouteKey(): string {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Phi signal route keys require crypto.randomUUID().");
  }
  return globalThis.crypto.randomUUID();
}

export type PhiRenderableBlockSignalPayload =
  | PhiRenderableBlockVisibility
  | boolean
  | string
  | number
  | PhiRenderableBlockSize
  | PhiCmsGridLayoutSlotPlacementConfig[]
  | Record<string, unknown>
  | null;
