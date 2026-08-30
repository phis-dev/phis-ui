import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_OBSERVABILITY_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/observability/controller`;
export const PHI_OBSERVABILITY_CONTROLLER_KEY = "default";
export const PHI_OBSERVABILITY_CONTROLLER_TYPE =
  `${PHI_OBSERVABILITY_CONTROLLER_PLUGIN_KEY}/${PHI_OBSERVABILITY_CONTROLLER_KEY}` as const;
export const PHI_OBSERVABILITY_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiObservabilityControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_OBSERVABILITY_CONTROLLER_PLUGIN_KEY,
    PHI_OBSERVABILITY_CONTROLLER_KEY,
    PHI_OBSERVABILITY_CONTROLLER_INSTANCE_KEY,
  );
}
