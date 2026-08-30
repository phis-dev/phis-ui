import type {
  PhiRuntimeControllerFlag,
  PhiRuntimeControllerDefinition,
  PhiRuntimeControllerPlugin,
  PhiRuntimeControllerSetting,
} from "../../types/cms-plugins";
import {
  assertPhiSignalPluginMetaContract,
  createPhiControllerSignalAddress,
  type PhiSignalScope,
} from "../../types/signals";

export type PhiAnyRuntimeControllerDefinition = PhiRuntimeControllerDefinition<unknown, unknown>;
export type PhiAnyRuntimeControllerPlugin = PhiRuntimeControllerPlugin<unknown, unknown>;

export type PhiRuntimeControllerDefinitionProvider = {
  key: string;
  definitions: readonly PhiAnyRuntimeControllerDefinition[];
};

export type PhiRuntimeControllerProvider = {
  key: string;
  controllerPlugins: readonly PhiAnyRuntimeControllerPlugin[];
};

export function buildPhiRuntimeControllerDefinitionType(definition: PhiAnyRuntimeControllerDefinition) {
  return `${definition.pluginKey}/${definition.key}`;
}

export type PhiRuntimeControllerDefinitionType = ReturnType<typeof buildPhiRuntimeControllerDefinitionType>;

export function buildPhiRuntimeControllerDefinitionMap(
  definitions: readonly PhiAnyRuntimeControllerDefinition[],
): Map<string, PhiAnyRuntimeControllerDefinition> {
  const byType = new Map<string, PhiAnyRuntimeControllerDefinition>();

  for (const definition of definitions) {
    const namespacedType = buildPhiRuntimeControllerDefinitionType(definition);
    if (byType.has(namespacedType)) {
      throw new Error(`Duplicate runtime controller definition type "${namespacedType}".`);
    }

    assertPhiSignalPluginMetaContract(definition.runtimeSignals, `${namespacedType}.runtimeSignals`);
    byType.set(namespacedType, definition);
  }

  return byType;
}

export const buildPhiRuntimeControllerPluginType = buildPhiRuntimeControllerDefinitionType;

export function buildPhiRuntimeControllerPluginMap(
  plugins: readonly PhiAnyRuntimeControllerPlugin[],
): Map<string, PhiAnyRuntimeControllerPlugin> {
  return buildPhiRuntimeControllerDefinitionMap(plugins) as Map<string, PhiAnyRuntimeControllerPlugin>;
}

export function hasPhiRuntimeControllerFlag(
  plugin: Pick<PhiAnyRuntimeControllerPlugin, "flags">,
  flag: PhiRuntimeControllerFlag,
) {
  return plugin.flags?.includes(flag) ?? false;
}

export function resolvePhiRuntimeControllerInstanceKey(
  plugin: Pick<PhiAnyRuntimeControllerPlugin, "key" | "flags">,
  setting: Pick<PhiRuntimeControllerSetting, "instanceKey">,
) {
  const instanceKey = setting.instanceKey.trim() || "default";
  if (!hasPhiRuntimeControllerFlag(plugin, "multiInstance") && instanceKey !== "default") {
    throw new Error(
      `Runtime controller "${plugin.key}" is single-instance and must use instanceKey "default".`,
    );
  }

  return instanceKey;
}

export function resolvePhiRuntimeControllerSignalScope(
  mountScope: PhiRuntimeControllerSetting["mountScope"],
): Extract<PhiSignalScope, "site" | "area" | "page"> {
  return mountScope;
}

export function parsePhiRuntimeControllerConfig<TConfig>(
  definition: PhiRuntimeControllerDefinition<TConfig, unknown>,
  raw: Record<string, unknown> | null | undefined,
): TConfig {
  return definition.parseConfig({
    ...(definition.defaultConfig as Record<string, unknown> | undefined),
    ...(raw ?? {}),
  });
}

export function resolvePhiRuntimeControllerMount(
  definition: PhiAnyRuntimeControllerDefinition,
  setting: PhiRuntimeControllerSetting,
) {
  if (!definition.allowedMountScopes.includes(setting.mountScope)) {
    throw new Error(
      `Runtime controller "${definition.key}" cannot be mounted at "${setting.mountScope}" scope.`,
    );
  }

  const instanceKey = resolvePhiRuntimeControllerInstanceKey(definition, setting);
  const address = createPhiControllerSignalAddress(definition.pluginKey, definition.key, instanceKey);

  return {
    instanceKey,
    address,
  };
}
