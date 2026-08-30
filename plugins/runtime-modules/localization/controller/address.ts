import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_LOCALIZATION_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/localization/controller`;
export const PHI_LOCALIZATION_CONTROLLER_KEY = "default";
export const PHI_LOCALIZATION_CONTROLLER_TYPE =
  `${PHI_LOCALIZATION_CONTROLLER_PLUGIN_KEY}/${PHI_LOCALIZATION_CONTROLLER_KEY}` as const;
export const PHI_LOCALIZATION_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiLocalizationControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_LOCALIZATION_CONTROLLER_PLUGIN_KEY,
    PHI_LOCALIZATION_CONTROLLER_KEY,
    PHI_LOCALIZATION_CONTROLLER_INSTANCE_KEY,
  );
}
