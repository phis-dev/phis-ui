import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_THEME_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/theme/controller`;
export const PHI_THEME_CONTROLLER_KEY = "default";
export const PHI_THEME_CONTROLLER_TYPE =
  `${PHI_THEME_CONTROLLER_PLUGIN_KEY}/${PHI_THEME_CONTROLLER_KEY}` as const;
export const PHI_THEME_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiThemeControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_THEME_CONTROLLER_PLUGIN_KEY,
    PHI_THEME_CONTROLLER_KEY,
    PHI_THEME_CONTROLLER_INSTANCE_KEY,
  );
}
