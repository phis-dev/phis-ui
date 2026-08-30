import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../types/signals";

export const PHI_FORM_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/core/controller`;
export const PHI_FORM_CONTROLLER_KEY = "form";
export const PHI_FORM_CONTROLLER_TYPE =
  `${PHI_FORM_CONTROLLER_PLUGIN_KEY}/${PHI_FORM_CONTROLLER_KEY}` as const;

export function createPhiRuntimeFormControllerAddress(instanceKey: string | number) {
  return createPhiControllerSignalAddress(
    PHI_FORM_CONTROLLER_PLUGIN_KEY,
    PHI_FORM_CONTROLLER_KEY,
    instanceKey,
  );
}
