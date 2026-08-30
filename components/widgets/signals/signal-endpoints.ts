import type {
  PhiSignalAddress,
  PhiSignalInputCapability,
  PhiSignalOutputCapability,
  PhiSignalPluginMeta,
  PhiSignalScope,
} from "../../../types/signals";
import {
  createPhiControllerSignalAddress,
  createPhiSignalAddress,
  createPhiSignalSubcontrolAddress,
} from "../../../types/signals";
import type {
  PhiCmsWidgetSignalSubcontrolCollection,
  PhiRuntimeModuleControllerDescriptor,
  PhiRuntimeControllerSetting,
} from "../../../types";
import { PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS } from "./renderable-block-signal-capabilities";
import type { PhiCmsInstanceId } from "../../../types/cms-instance-id";

export type PhiSignalEndpointTarget = "self" | "subcontrol";

export type PhiSignalEndpoint = {
  address: PhiSignalAddress;
  label: string;
  target: PhiSignalEndpointTarget;
  routeScope: PhiSignalScope;
  emits: PhiSignalOutputCapability[];
  listens: PhiSignalInputCapability[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function capabilityTargetsSelf(capability: PhiSignalOutputCapability | PhiSignalInputCapability) {
  return capability.target == null || capability.target === "self" || capability.target === "both";
}

function capabilityTargetsSubcontrol(capability: PhiSignalOutputCapability | PhiSignalInputCapability) {
  return capability.target === "subcontrol" || capability.target === "both";
}

function inputCapabilityKey(capability: PhiSignalInputCapability) {
  return [
    capability.channel,
    capability.action,
    capability.valueType,
    capability.valueSchema ?? "",
  ].join("\u0000");
}

function outputCapabilityKey(capability: PhiSignalOutputCapability) {
  return [
    capability.id,
    capability.action,
    capability.valueType,
    capability.valueSchema ?? "",
    capability.target ?? "",
  ].join("\u0000");
}

function readWidgetSignalSubcontrols(
  config: Record<string, unknown> | null | undefined,
  collections: readonly PhiCmsWidgetSignalSubcontrolCollection[] | null | undefined,
) {
  if (!config || !collections || collections.length === 0) {
    return [];
  }

  const subcontrols: Array<{ key: string; label: string }> = [];
  const keys = new Set<string>();
  for (const collection of collections) {
    const items = config[collection.configKey];
    if (!Array.isArray(items)) {
      continue;
    }

    for (const rawItem of items) {
      if (!isRecord(rawItem)) {
        continue;
      }

      const key = readString(rawItem[collection.keyField]);
      if (!key) {
        continue;
      }
      if (keys.has(key)) {
        throw new Error(`Duplicate signal subcontrol key "${key}".`);
      }
      keys.add(key);
      const label = collection.labelFields
        ?.map((field) => readString(rawItem[field]))
        .find((value): value is string => value != null) ?? key;
      subcontrols.push({ key, label });
    }
  }

  return subcontrols;
}

export function resolvePhiWidgetSignalSubcontrolAddresses({
  blockId,
  config,
  signalSubcontrols,
}: {
  blockId: PhiCmsInstanceId;
  config: Record<string, unknown> | null | undefined;
  signalSubcontrols: readonly PhiCmsWidgetSignalSubcontrolCollection[] | null | undefined;
}) {
  return readWidgetSignalSubcontrols(config, signalSubcontrols).map(({ key }) =>
    createPhiSignalSubcontrolAddress("cms", blockId, key)
  );
}

function uniqueInputCapabilities(capabilities: readonly PhiSignalInputCapability[]) {
  const seen = new Set<string>();
  return capabilities.filter((capability) => {
    const key = inputCapabilityKey(capability);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueOutputCapabilities(capabilities: readonly PhiSignalOutputCapability[]) {
  const seen = new Set<string>();
  return capabilities.filter((capability) => {
    const key = outputCapabilityKey(capability);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function assertNoDuplicateInputCapabilities(
  capabilities: readonly PhiSignalInputCapability[],
  context: string,
) {
  const seen = new Set<string>();
  for (const capability of capabilities) {
    const key = inputCapabilityKey(capability);
    if (seen.has(key)) {
      throw new Error(
        `${context}: duplicate receiver capability "${capability.channel}/${capability.action}:${capability.valueType}".`,
      );
    }
    seen.add(key);
  }
}

function assertNoDuplicateOutputCapabilities(
  capabilities: readonly PhiSignalOutputCapability[],
  context: string,
) {
  const seen = new Set<string>();
  for (const capability of capabilities) {
    const key = outputCapabilityKey(capability);
    if (seen.has(key)) {
      throw new Error(
        `${context}: duplicate sender capability "${capability.id}/${capability.action}:${capability.valueType}".`,
      );
    }
    seen.add(key);
  }
}

function readWidgetSignalSubcontrolEndpoints(
  config: Record<string, unknown> | null | undefined,
  blockId: PhiCmsInstanceId,
  runtimeSignals: PhiSignalPluginMeta | null | undefined,
  routeScope: PhiSignalScope,
  collections: readonly PhiCmsWidgetSignalSubcontrolCollection[] | null | undefined,
): PhiSignalEndpoint[] {
  if (!config || !collections || collections.length === 0) {
    return [];
  }

  const emits = (runtimeSignals?.emits ?? []).filter(capabilityTargetsSubcontrol);
  const listens = (runtimeSignals?.listens ?? []).filter(capabilityTargetsSubcontrol);
  if (emits.length === 0 && listens.length === 0) {
    return [];
  }

  return readWidgetSignalSubcontrols(config, collections).map(({ key, label }) => ({
    address: createPhiSignalSubcontrolAddress("cms", blockId, key),
    label,
    target: "subcontrol" as const,
    routeScope,
    emits,
    listens,
  }));
}

function resolveSelfSignalEndpoint({
  address,
  label,
  runtimeSignals,
  routeScope,
  inheritedListens = [],
}: {
  address: PhiSignalAddress;
  label: string;
  runtimeSignals?: PhiSignalPluginMeta | null;
  routeScope: PhiSignalScope;
  inheritedListens?: readonly PhiSignalInputCapability[];
}): PhiSignalEndpoint {
  const emits = (runtimeSignals?.emits ?? []).filter(capabilityTargetsSelf);
  const listens = [
    ...(runtimeSignals?.listens ?? []).filter(capabilityTargetsSelf),
    ...inheritedListens,
  ];
  assertNoDuplicateOutputCapabilities(emits, `${address}.emits`);
  assertNoDuplicateInputCapabilities(listens, `${address}.listens`);

  return {
    address,
    label,
    target: "self",
    routeScope,
    emits,
    listens,
  };
}

export function resolvePhiWidgetSignalEndpoints({
  blockId,
  label,
  typeKey,
  config,
  runtimeSignals,
  signalSubcontrols,
  routeScope = "widget",
}: {
  blockId: PhiCmsInstanceId;
  label?: string | null;
  typeKey?: string | null;
  config?: Record<string, unknown> | null;
  runtimeSignals?: PhiSignalPluginMeta | null;
  signalSubcontrols?: readonly PhiCmsWidgetSignalSubcontrolCollection[] | null;
  routeScope?: PhiSignalScope;
}): PhiSignalEndpoint[] {
  const parentEndpoint = resolveSelfSignalEndpoint({
    address: createPhiSignalAddress("cms", blockId),
    label: label?.trim() || typeKey?.trim() || `cms:${blockId}`,
    runtimeSignals,
    routeScope,
    inheritedListens: PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS,
  });

  const subcontrolEndpoints = readWidgetSignalSubcontrolEndpoints(
    config,
    blockId,
    runtimeSignals,
    routeScope,
    signalSubcontrols,
  );

  return [parentEndpoint, ...subcontrolEndpoints];
}

export function resolvePhiLayoutSignalEndpoints({
  blockId,
  label,
  typeKey,
  kind,
  runtimeSignals,
  routeScope = "layout",
}: {
  blockId: PhiCmsInstanceId;
  label?: string | null;
  typeKey?: string | null;
  kind: "layout";
  runtimeSignals?: PhiSignalPluginMeta | null;
  routeScope?: PhiSignalScope;
}): PhiSignalEndpoint[] {
  return [
    resolveSelfSignalEndpoint({
      address: createPhiSignalAddress("cms", blockId),
      label: label?.trim() || typeKey?.trim() || `${kind}:${blockId}`,
      runtimeSignals,
      routeScope,
      inheritedListens: PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS,
    }),
  ];
}

export function resolvePhiRegionSignalEndpoints({
  regionKey,
  label,
  routeScope,
}: {
  regionKey: string;
  label?: string | null;
  routeScope: Extract<PhiSignalScope, "area" | "page">;
}): PhiSignalEndpoint[] {
  return [
    resolveSelfSignalEndpoint({
      address: createPhiSignalAddress("region", regionKey),
      label: label?.trim() || `region:${regionKey}`,
      routeScope,
      inheritedListens: PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS,
    }),
  ];
}

export function resolvePhiControllerSignalEndpoints({
  definition,
  setting,
  routeScope = "area",
}: {
  definition: PhiRuntimeModuleControllerDescriptor;
  setting: Pick<PhiRuntimeControllerSetting, "instanceKey">;
  routeScope?: PhiSignalScope;
}): PhiSignalEndpoint[] {
  const instanceKey = setting.instanceKey.trim() || "default";
  return [
    resolveSelfSignalEndpoint({
      address: createPhiControllerSignalAddress(definition.pluginKey, definition.key, instanceKey),
      label: definition.title,
      runtimeSignals: definition.runtimeSignals,
      routeScope,
    }),
  ];
}

export function resolvePhiSignalEndpointCapabilities(endpoints: readonly PhiSignalEndpoint[]) {
  return {
    emits: uniqueOutputCapabilities(endpoints.flatMap((endpoint) => endpoint.emits)),
    listens: uniqueInputCapabilities(endpoints.flatMap((endpoint) => endpoint.listens)),
  };
}
