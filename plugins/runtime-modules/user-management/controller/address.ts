import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_USER_MANAGEMENT_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/user-management/controller`;
export const PHI_USER_MANAGEMENT_CONTROLLER_KEY = "default";
export const PHI_USER_MANAGEMENT_CONTROLLER_TYPE =
  `${PHI_USER_MANAGEMENT_CONTROLLER_PLUGIN_KEY}/${PHI_USER_MANAGEMENT_CONTROLLER_KEY}` as const;
export const PHI_USER_MANAGEMENT_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiUserManagementControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_USER_MANAGEMENT_CONTROLLER_PLUGIN_KEY,
    PHI_USER_MANAGEMENT_CONTROLLER_KEY,
    PHI_USER_MANAGEMENT_CONTROLLER_INSTANCE_KEY,
  );
}
