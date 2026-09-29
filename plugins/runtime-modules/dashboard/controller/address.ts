import { PHI_SHARED_PACKAGE_NAME } from "../../../../types/signals";

export const PHI_DASHBOARD_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/dashboard/controller`;
export const PHI_DASHBOARD_CONTROLLER_KEY = "default";
export const PHI_DASHBOARD_CONTROLLER_TYPE =
  `${PHI_DASHBOARD_CONTROLLER_PLUGIN_KEY}/${PHI_DASHBOARD_CONTROLLER_KEY}` as const;
