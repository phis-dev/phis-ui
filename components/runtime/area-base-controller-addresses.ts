import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../types/signals";

export const PHI_PUBLIC_BASE_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/public/controller`;
export const PHI_APP_BASE_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/app/controller`;
export const PHI_AUTH_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/auth/controller`;
export const PHI_ACCOUNTING_BASE_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/accounting/controller`;

export const PHI_PUBLIC_BASE_CONTROLLER_KEY = "base" as const;
export const PHI_APP_BASE_CONTROLLER_KEY = "base" as const;
export const PHI_AUTH_CONTROLLER_KEY = "default" as const;
export const PHI_ACCOUNTING_BASE_CONTROLLER_KEY = "base" as const;

export const PHI_PUBLIC_BASE_CONTROLLER_TYPE = `${PHI_PUBLIC_BASE_CONTROLLER_PLUGIN_KEY}/${PHI_PUBLIC_BASE_CONTROLLER_KEY}` as const;
export const PHI_APP_BASE_CONTROLLER_TYPE = `${PHI_APP_BASE_CONTROLLER_PLUGIN_KEY}/${PHI_APP_BASE_CONTROLLER_KEY}` as const;
export const PHI_AUTH_CONTROLLER_TYPE = `${PHI_AUTH_CONTROLLER_PLUGIN_KEY}/${PHI_AUTH_CONTROLLER_KEY}` as const;
export const PHI_ACCOUNTING_BASE_CONTROLLER_TYPE = `${PHI_ACCOUNTING_BASE_CONTROLLER_PLUGIN_KEY}/${PHI_ACCOUNTING_BASE_CONTROLLER_KEY}` as const;

export function createPhiAuthControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_SHARED_PACKAGE_NAME,
    PHI_AUTH_CONTROLLER_KEY,
    "default",
  );
}
