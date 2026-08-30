import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_EDITOR_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/editor/controller`;
export const PHI_EDITOR_CONTROLLER_KEY = "default";
export const PHI_EDITOR_CONTROLLER_TYPE =
  `${PHI_EDITOR_CONTROLLER_PLUGIN_KEY}/${PHI_EDITOR_CONTROLLER_KEY}` as const;
export const PHI_EDITOR_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiEditorControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_EDITOR_CONTROLLER_PLUGIN_KEY,
    PHI_EDITOR_CONTROLLER_KEY,
    PHI_EDITOR_CONTROLLER_INSTANCE_KEY,
  );
}
