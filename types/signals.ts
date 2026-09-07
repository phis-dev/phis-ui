import type {
  PhiRenderableBlockSize,
  PhiRenderableBlockVisibility,
} from "./renderable-block";
import type { PhiCmsGridLayoutSlotPlacementConfig } from "./cms-config";
import { readPhiCmsInstanceId, type PhiCmsInstanceId } from "./cms-instance-id";
import { isPhiNpmPackageName } from "../constants/package";
import { createPhiModuleScopedKey, isPhiModuleScopedKey } from "../constants/runtime-module-ownership";

export { PHI_SHARED_PACKAGE_NAME } from "../constants/package";

/*
 * The closed vocabularies and the value-schema format come from `@phis/contracts/signals`, because
 * phi-server validates stored wiring against the same lists. They were two lists once, and they drifted:
 * this side had `date`, `time` and `length`, the server had not, and a length control's change signal
 * was refused on save.
 */
export {
  PHI_SIGNAL_ACTIONS,
  PHI_SIGNAL_SCOPES,
  PHI_SIGNAL_VALUE_SCHEMA_NAMESPACE,
  PHI_SIGNAL_VALUE_SCHEMA_SEPARATOR,
  PHI_SIGNAL_VALUE_TYPES,
  isPhiSignalAction,
  isPhiSignalScope,
  isPhiSignalValueType,
  type PhiSignalAction,
  type PhiSignalScope,
  type PhiSignalValueSchema,
  type PhiSignalValueType,
} from "@phis/contracts/signals";

/*
 * The address families come from there too, and for a sharper reason.
 *
 * A wiring is stored by the Builder, checked by phi-server on the way in and delivered here at runtime,
 * so all three parse the same string. Two of them did it from separate copies until 2026-09-07 -- the
 * server's said in its own comment that it "mirrors the grammar in @phis/ui", because it could not
 * import it.
 */
export {
  isPhiControllerSignalAddress,
  isPhiSignalAddress,
  isPhiSignalReceiver,
  readPhiSignalAddress,
  type PhiControllerSignalAddress,
  type PhiSignalAddress,
  type PhiSignalAddressFamily,
  type PhiSignalReceiver,
  type PhiSignalSender,
} from "@phis/contracts/signals";

import {
  isPhiControllerPluginKey,
  isPhiControllerSignalAddress,
  isPhiSignalAddressSegment,
  isPhiSignalReceiver,
  type PhiControllerSignalAddress,
  type PhiSignalAddress,
  type PhiSignalAddressFamily,
  type PhiSignalReceiver,
  type PhiSignalSender,
} from "@phis/contracts/signals";

import {
  PHI_SIGNAL_VALUE_SCHEMA_NAMESPACE,
  PHI_SIGNAL_VALUE_SCHEMA_SEPARATOR,
  isPhiSignalAction,
  isPhiSignalScope,
  isPhiSignalValueType,
  type PhiSignalAction,
  type PhiSignalScope,
  type PhiSignalValueSchema,
  type PhiSignalValueType,
} from "@phis/contracts/signals";

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

function normalizePhiSignalAddressPart(value: string | number) {
  return String(value).trim();
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


export function isPhiSignalChannel(value: unknown): value is PhiSignalChannel {
  return typeof value === "string" && value.trim().length > 0;
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
