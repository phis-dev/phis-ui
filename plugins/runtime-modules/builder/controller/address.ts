import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_BUILDER_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/builder/controller`;
export const PHI_BUILDER_CONTROLLER_KEY = "default";
export const PHI_BUILDER_CONTROLLER_TYPE =
  `${PHI_BUILDER_CONTROLLER_PLUGIN_KEY}/${PHI_BUILDER_CONTROLLER_KEY}` as const;
export const PHI_BUILDER_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiBuilderControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_BUILDER_CONTROLLER_PLUGIN_KEY,
    PHI_BUILDER_CONTROLLER_KEY,
    PHI_BUILDER_CONTROLLER_INSTANCE_KEY,
  );
}
