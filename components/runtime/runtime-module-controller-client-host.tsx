"use client";

import { lazy, Suspense, type ComponentType } from "react";

import type { PhiRuntimeModuleControllerClientProps, PhiRuntimeModuleId } from "../../types/cms-plugins";
import { usePhiRuntimeModuleControllerClientManifest } from "./runtime-module-controller-client-manifest";

const controllerClientByLoader = new WeakMap<() => Promise<ComponentType<PhiRuntimeModuleControllerClientProps>>, ComponentType<PhiRuntimeModuleControllerClientProps>>();

function getControllerClient(load: () => Promise<ComponentType<PhiRuntimeModuleControllerClientProps>>) {
  const cached = controllerClientByLoader.get(load);
  if (cached) return cached;
  const Client = lazy(async () => ({ default: await load() }));
  controllerClientByLoader.set(load, Client);
  return Client;
}

export function PhiRuntimeModuleControllerClientHost({ controllers }: { controllers: readonly (PhiRuntimeModuleControllerClientProps & { moduleId: PhiRuntimeModuleId })[] }) {
  const manifest = usePhiRuntimeModuleControllerClientManifest();
  return controllers.map(({ moduleId, ...props }) => {
    const loadController = manifest.get(moduleId);
    if (!loadController) throw new Error(`Active runtime module "${moduleId}" has no Controller Client loader.`);
    const ControllerClient = getControllerClient(loadController);
    return <Suspense key={`${moduleId}:${props.setting.instanceKey ?? "default"}`} fallback={null}><ControllerClient {...props} /></Suspense>;
  });
}
