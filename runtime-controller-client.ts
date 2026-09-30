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
  PhiRuntimeModuleControllerClient,
  PhiRuntimeModuleControllerClientManifest,
} from "./components/runtime/runtime-module-controller-client-manifest";
export type { PhiRuntimeModuleControllerClientProps } from "./types/cms-plugins";
/*
 * A state machine, held by the Controller that hosts it. The grammar and its validator come from
 * `@phis/ui/types`; this is the part that runs one, and a Controller is the only place it may run
 * (MODULES.md, "State in a Controller").
 */
export { usePhiStateMachineBinding } from "./components/runtime/phi-state-machine-binding";
export type {
  PhiStateMachineBinding,
  PhiStateMachineSendResult,
  UsePhiStateMachineBindingOptions,
} from "./components/runtime/phi-state-machine-binding";
/*
 * What a Table said, read by the Controller that listens to it.
 *
 * A Controller's whole job is translating one surface's vocabulary into another's, and a Table's half of
 * that is `{ selectedRowIdentities }` and `{ actionKey, rowIdentity }`. The readers sit in the table
 * contract, which `@phis/ui/types` carries as types only -- so a Module Controller could name the shape
 * and not read it, and would parse the payload by hand, which is the one place a mistake is silent.
 */
export {
  readPhiTableActionSignalValue,
  readPhiTableSelectionSignalValue,
} from "./types/table-widget";
