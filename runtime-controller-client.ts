"use client";

export { createPhiRuntimeControllerClient } from "./components/runtime/runtime-controller-client-factory";
export { usePhiRuntimeConditionStateResponder } from "./components/runtime/runtime-condition-state-responder";
export { PhiRuntimeModuleControllerClientManifestProvider } from "./components/runtime/runtime-module-controller-client-manifest";
export {
  definePhiRuntimeModuleControllerClientAreaContribution,
  extendPhiRuntimeModuleControllerClientManifest,
} from "./plugins/runtime-modules/area-contributions-controller-client";
export type {
  PhiRuntimeModuleControllerClientAreaContribution,
} from "./plugins/runtime-modules/area-contributions-controller-client";
export type {
  PhiRuntimeModuleControllerClientLoader,
  PhiRuntimeModuleControllerClientManifest,
} from "./components/runtime/runtime-module-controller-client-manifest";
export type { PhiRuntimeModuleControllerClientProps } from "./types/cms-plugins";
