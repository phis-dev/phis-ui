import {
  PHI_SHARED_PACKAGE_NAME,
  createPhiControllerSignalAddress,
} from "../../types/signals";

export const PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/core/controller`;
export const PHI_CORE_RUNTIME_CONTROLLER_KEY = "default";
export const PHI_CORE_RUNTIME_CONTROLLER_TYPE =
  `${PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY}/${PHI_CORE_RUNTIME_CONTROLLER_KEY}` as const;
export const PHI_CORE_RUNTIME_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiCoreRuntimeControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY,
    PHI_CORE_RUNTIME_CONTROLLER_KEY,
    PHI_CORE_RUNTIME_CONTROLLER_INSTANCE_KEY,
  );
}
