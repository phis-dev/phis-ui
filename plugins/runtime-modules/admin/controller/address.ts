import { PHI_SHARED_PACKAGE_NAME } from "../../../../types/signals";

export const PHI_ADMIN_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/admin/controller`;
export const PHI_ADMIN_CONTROLLER_KEY = "default";
export const PHI_ADMIN_CONTROLLER_TYPE =
  `${PHI_ADMIN_CONTROLLER_PLUGIN_KEY}/${PHI_ADMIN_CONTROLLER_KEY}` as const;
