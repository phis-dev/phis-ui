import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_GROUPS_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/groups/controller`;
export const PHI_GROUPS_CONTROLLER_KEY = "default";
export const PHI_GROUPS_CONTROLLER_TYPE =
  `${PHI_GROUPS_CONTROLLER_PLUGIN_KEY}/${PHI_GROUPS_CONTROLLER_KEY}` as const;
export const PHI_GROUPS_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiGroupsControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_GROUPS_CONTROLLER_PLUGIN_KEY,
    PHI_GROUPS_CONTROLLER_KEY,
    PHI_GROUPS_CONTROLLER_INSTANCE_KEY,
  );
}
