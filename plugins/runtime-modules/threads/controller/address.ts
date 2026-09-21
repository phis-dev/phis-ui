import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_THREADS_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/threads/controller`;
export const PHI_THREADS_CONTROLLER_KEY = "default";
export const PHI_THREADS_CONTROLLER_TYPE =
  `${PHI_THREADS_CONTROLLER_PLUGIN_KEY}/${PHI_THREADS_CONTROLLER_KEY}` as const;
export const PHI_THREADS_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiThreadsControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_THREADS_CONTROLLER_PLUGIN_KEY,
    PHI_THREADS_CONTROLLER_KEY,
    PHI_THREADS_CONTROLLER_INSTANCE_KEY,
  );
}
