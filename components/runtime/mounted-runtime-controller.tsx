"use client";

import { useEffect, useMemo } from "react";

import type {
  PhiRuntimeModuleControllerClientProps,
} from "../../types";
import {
  parsePhiRuntimeControllerConfig,
  resolvePhiRuntimeControllerMount,
  resolvePhiRuntimeControllerSignalScope,
  type PhiAnyRuntimeControllerPlugin,
} from "../../plugins/registries/runtime-controller-core";
import { registerPhiSignalInstance } from "./runtime-signal-registry";
import { usePhiSignalRuntimePartition } from "./runtime-signal-partition";
import { usePhiRuntimeControllerConfigOverlay } from "./runtime-controller-config-overlays";

export type PhiMountedRuntimeControllerProps = PhiRuntimeModuleControllerClientProps & {
  plugin: PhiAnyRuntimeControllerPlugin;
};

export function PhiMountedRuntimeController({
  plugin,
  setting,
  runtime,
  context,
  preloadDataByAddress,
}: PhiMountedRuntimeControllerProps) {
  const signalPartition = usePhiSignalRuntimePartition();
  const { instanceKey, address } = resolvePhiRuntimeControllerMount(plugin, setting);
  // What the shown Page tells this Controller, when the Area runs it (runtime-controller-config-overlays).
  const pageConfig = usePhiRuntimeControllerConfigOverlay(address);
  const parsedConfig = useMemo(
    () => parsePhiRuntimeControllerConfig(plugin, pageConfig ? { ...setting.config, ...pageConfig } : setting.config),
    [pageConfig, plugin, setting.config],
  );
  const preloadData = preloadDataByAddress?.[address] ?? null;

  useEffect(() => {
    return registerPhiSignalInstance(signalPartition, {
      address,
      scope: resolvePhiRuntimeControllerSignalScope(setting.mountScope),
      context: context ?? undefined,
    });
  }, [address, context, setting.mountScope, signalPartition]);

  return plugin.renderController({
    key: plugin.key,
    instanceKey,
    address,
    mountScope: setting.mountScope,
    runtime,
    config: parsedConfig,
    preloadData,
  });
}
