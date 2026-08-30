import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_REVISIONS_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/revisions/controller`;
export const PHI_REVISIONS_CONTROLLER_KEY = "default";
export const PHI_REVISIONS_CONTROLLER_TYPE =
  `${PHI_REVISIONS_CONTROLLER_PLUGIN_KEY}/${PHI_REVISIONS_CONTROLLER_KEY}` as const;
export const PHI_REVISIONS_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiRevisionsControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_REVISIONS_CONTROLLER_PLUGIN_KEY,
    PHI_REVISIONS_CONTROLLER_KEY,
    PHI_REVISIONS_CONTROLLER_INSTANCE_KEY,
  );
}
