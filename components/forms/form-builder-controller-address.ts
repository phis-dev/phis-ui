import {
  PHI_SHARED_PACKAGE_NAME,
  createPhiControllerSignalAddress,
} from "../../types/signals";

export const PHI_FORM_BUILDER_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/form-builder/controller`;
export const PHI_FORM_BUILDER_CONTROLLER_KEY = "default";
export const PHI_FORM_BUILDER_CONTROLLER_TYPE =
  `${PHI_FORM_BUILDER_CONTROLLER_PLUGIN_KEY}/${PHI_FORM_BUILDER_CONTROLLER_KEY}` as const;
export const PHI_FORM_BUILDER_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiFormBuilderControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_FORM_BUILDER_CONTROLLER_PLUGIN_KEY,
    PHI_FORM_BUILDER_CONTROLLER_KEY,
    PHI_FORM_BUILDER_CONTROLLER_INSTANCE_KEY,
  );
}
