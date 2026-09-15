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

/**
 * The address the Auth Controller actually answers at.
 *
 * It has to be built from the same three parts the mount uses -- plugin key, controller key, instance
 * key -- because that is what `resolvePhiRuntimeControllerMount` registers. This named the package
 * instead of the plugin, so every sender addressed `controller:@phis/ui/default:default` while the
 * Controller listened at `controller:@phis/ui/modules/auth/controller/default:default`. Nothing ever
 * reached it, and nothing said so: a signal to an unregistered address is held for a receiver that will
 * never mount, which is silent by design.
 */
export function createPhiAuthControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_AUTH_CONTROLLER_PLUGIN_KEY,
    PHI_AUTH_CONTROLLER_KEY,
    "default",
  );
}
