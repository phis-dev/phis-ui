import type {
  PhiBlockRuntime,
  PhiRuntimeModuleControllerClientProps,
  PhiRuntimeControllerPreloadMap,
  PhiRuntimeControllerSetting,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
} from "../../types";
import {
  parsePhiRuntimeControllerConfig,
  resolvePhiRuntimeControllerMount,
  type PhiAnyRuntimeControllerDefinition,
} from "../../plugins/registries/runtime-controller-core";
import type { PhiSignalRuntimeContext } from "../../types/signals";
import { PhiRuntimeModuleControllerClientHost } from "./runtime-module-controller-client-host";
import { PhiPlatformRuntimeControllerClientHost } from "./platform-runtime-controller-client-host";
import { PHI_FORM_CONTROLLER_TYPE } from "../forms/runtime-form-controller-address";

type RuntimeControllerDefinitionRegistryLike =
  | Map<string, PhiAnyRuntimeControllerDefinition>
  | ReadonlyMap<string, PhiAnyRuntimeControllerDefinition>;

export type PhiRuntimeControllerServerHostProps = {
  controllers?: readonly PhiRuntimeControllerSetting[] | null;
  runtime: PhiBlockRuntime;
  registry: RuntimeControllerDefinitionRegistryLike;
  controllerModuleIdsByType: ReadonlyMap<string, PhiRuntimeModuleId>;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  context?: PhiSignalRuntimeContext | null;
};

export async function resolvePhiRuntimeControllerPreloads({
  controllers,
  runtime,
  registry,
  runtimeModuleCatalog,
}: Pick<PhiRuntimeControllerServerHostProps, "controllers" | "runtime" | "registry" | "runtimeModuleCatalog">): Promise<{
  controllers: PhiRuntimeControllerSetting[];
  preloadDataByAddress: PhiRuntimeControllerPreloadMap;
}> {
  const activeControllers: PhiRuntimeControllerSetting[] = [];
  const preloadDataByAddress: PhiRuntimeControllerPreloadMap = {};
  const seenAddresses = new Set<string>();

  for (const setting of controllers ?? []) {
    const definition = registry.get(setting.type);
    if (!definition) {
      throw new Error(`Runtime controller "${setting.type}" is not registered.`);
    }

    if (setting.enabled === false) {
      continue;
    }

    const { instanceKey, address } = resolvePhiRuntimeControllerMount(definition, setting);
    if (seenAddresses.has(address)) {
      throw new Error(`Duplicate runtime controller mount "${address}".`);
    }
    seenAddresses.add(address);

    const resolvedSetting = {
      ...setting,
      instanceKey,
    };
    activeControllers.push(resolvedSetting);

    if (!definition.serverPreload) {
      continue;
    }

    const parsedConfig = parsePhiRuntimeControllerConfig(definition, setting.config);
    preloadDataByAddress[address] = await definition.serverPreload({
      key: definition.key,
      instanceKey,
      address,
      mountScope: setting.mountScope,
      runtime,
      runtimeModuleCatalog,
      setting: resolvedSetting,
      config: parsedConfig,
    });
  }

  return {
    controllers: activeControllers,
    preloadDataByAddress,
  };
}

export async function PhiRuntimeControllerServerHost({
  controllers,
  runtime,
  registry,
  controllerModuleIdsByType,
  runtimeModuleCatalog,
  context,
}: PhiRuntimeControllerServerHostProps) {
  const {
    controllers: activeControllers,
    preloadDataByAddress,
  } = await resolvePhiRuntimeControllerPreloads({
    controllers,
    runtime,
    registry,
    runtimeModuleCatalog,
  });

  if (activeControllers.length === 0) {
    return null;
  }

  const moduleControllers: Array<PhiRuntimeModuleControllerClientProps & { moduleId: PhiRuntimeModuleId }> = [];
  const platformControllers: PhiRuntimeModuleControllerClientProps[] = [];
  for (const setting of activeControllers) {
    const definition = registry.get(setting.type);
    if (!definition) {
      throw new Error(`Runtime controller "${setting.type}" is not registered.`);
    }
    const moduleId = controllerModuleIdsByType.get(setting.type);
    if (!moduleId) {
      if (setting.type !== PHI_FORM_CONTROLLER_TYPE) {
        throw new Error(`Runtime controller "${setting.type}" has no active owner module.`);
      }
      platformControllers.push({ setting, runtime, context, preloadDataByAddress });
      continue;
    }
    moduleControllers.push({ moduleId, setting, runtime, context, preloadDataByAddress });
  }
  return (
    <>
      {platformControllers.length > 0 ? (
        <PhiPlatformRuntimeControllerClientHost controllers={platformControllers} />
      ) : null}
      {moduleControllers.length > 0 ? (
        <PhiRuntimeModuleControllerClientHost controllers={moduleControllers} />
      ) : null}
    </>
  );
}
