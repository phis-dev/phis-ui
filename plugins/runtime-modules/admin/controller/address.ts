import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_ADMIN_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/admin/controller`;
export const PHI_ADMIN_CONTROLLER_KEY = "default";
export const PHI_ADMIN_CONTROLLER_TYPE =
  `${PHI_ADMIN_CONTROLLER_PLUGIN_KEY}/${PHI_ADMIN_CONTROLLER_KEY}` as const;
export const PHI_ADMIN_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiAdminControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_ADMIN_CONTROLLER_PLUGIN_KEY,
    PHI_ADMIN_CONTROLLER_KEY,
    PHI_ADMIN_CONTROLLER_INSTANCE_KEY,
  );
}
