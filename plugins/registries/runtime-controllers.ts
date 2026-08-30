import type { PhiRuntimeControllerSetting } from "../../types";
export {
  buildPhiRuntimeControllerDefinitionMap,
  buildPhiRuntimeControllerDefinitionType,
  buildPhiRuntimeControllerPluginMap,
  buildPhiRuntimeControllerPluginType,
  hasPhiRuntimeControllerFlag,
  parsePhiRuntimeControllerConfig,
  resolvePhiRuntimeControllerInstanceKey,
  resolvePhiRuntimeControllerMount,
  resolvePhiRuntimeControllerSignalScope,
  type PhiAnyRuntimeControllerDefinition,
  type PhiAnyRuntimeControllerPlugin,
  type PhiRuntimeControllerProvider,
} from "./runtime-controller-core";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readMountScope(value: unknown): PhiRuntimeControllerSetting["mountScope"] | null {
  return value === "site" || value === "area" || value === "page" ? value : null;
}

export function readPhiRuntimeControllerSettings(value: unknown): PhiRuntimeControllerSetting[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const settings = value
    .map((item): PhiRuntimeControllerSetting | null => {
      if (!isRecord(item)) {
        return null;
      }

      const type = typeof item.type === "string" ? item.type.trim() : "";
      const instanceKey = typeof item.instanceKey === "string" && item.instanceKey.trim()
        ? item.instanceKey.trim()
        : "default";
      const mountScope = readMountScope(item.mountScope);
      if (!type || !mountScope) {
        return null;
      }

      return {
        type: type as `${string}/${string}`,
        instanceKey,
        mountScope,
        enabled: typeof item.enabled === "boolean" ? item.enabled : undefined,
        config: isRecord(item.config) ? item.config : null,
      };
    })
    .filter((setting): setting is PhiRuntimeControllerSetting => setting != null);

  return settings.length > 0 ? settings : null;
}
