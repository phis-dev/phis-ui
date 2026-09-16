"use client";

import { Suspense } from "react";

import type { PhiRuntimeModuleControllerClientProps, PhiRuntimeModuleId } from "../../types/cms-plugins";
import { usePhiRuntimeModuleControllerClientManifest } from "./runtime-module-controller-client-manifest";

export function PhiRuntimeModuleControllerClientHost({ controllers }: { controllers: readonly (PhiRuntimeModuleControllerClientProps & { moduleId: PhiRuntimeModuleId })[] }) {
  const manifest = usePhiRuntimeModuleControllerClientManifest();
  return controllers.map(({ moduleId, ...props }) => {
    const ControllerClient = manifest.get(moduleId);
    if (!ControllerClient) throw new Error(`Active runtime module "${moduleId}" has no Controller Client.`);
    return <Suspense key={`${moduleId}:${props.setting.instanceKey ?? "default"}`} fallback={null}><ControllerClient {...props} /></Suspense>;
  });
}
