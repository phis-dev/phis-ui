import { PHI_CORE_RUNTIME_CONTROLLER_ADDRESS } from "@phis/contracts/signals";

import {
  PHI_SHARED_PACKAGE_NAME,
  createPhiControllerSignalAddress,
} from "../../types/signals";

export const PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/core/controller`;
export const PHI_CORE_RUNTIME_CONTROLLER_KEY = "default";
export const PHI_CORE_RUNTIME_CONTROLLER_TYPE =
  `${PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY}/${PHI_CORE_RUNTIME_CONTROLLER_KEY}` as const;
export const PHI_CORE_RUNTIME_CONTROLLER_INSTANCE_KEY = "default";

/**
 * The address built from this package's own constants, which has to be the string the contract names.
 *
 * `@phis/contracts/signals` privileges exactly one address in the Site scope, and phi-server refuses a
 * Site-scoped write to anything else. The rule is only worth anything if both sides mean the same
 * controller, so this is built here and checked against the contract rather than copied from it.
 */
export function createPhiCoreRuntimeControllerAddress() {
  const address = createPhiControllerSignalAddress(
    PHI_CORE_RUNTIME_CONTROLLER_PLUGIN_KEY,
    PHI_CORE_RUNTIME_CONTROLLER_KEY,
    PHI_CORE_RUNTIME_CONTROLLER_INSTANCE_KEY,
  );
  if (address !== PHI_CORE_RUNTIME_CONTROLLER_ADDRESS) {
    throw new Error(
      `The Core Runtime Controller answers at "${address}", but the signal contract privileges ` +
      `"${PHI_CORE_RUNTIME_CONTROLLER_ADDRESS}" in Site scope.`,
    );
  }
  return address;
}
