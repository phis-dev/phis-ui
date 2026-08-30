import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../types/signals";

export const PHI_ASSET_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/asset/controller`;
export const PHI_ASSET_CONTROLLER_KEY = "default";
export const PHI_ASSET_CONTROLLER_TYPE =
  `${PHI_ASSET_CONTROLLER_PLUGIN_KEY}/${PHI_ASSET_CONTROLLER_KEY}` as const;
export const PHI_ASSET_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiAssetControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_ASSET_CONTROLLER_PLUGIN_KEY,
    PHI_ASSET_CONTROLLER_KEY,
    PHI_ASSET_CONTROLLER_INSTANCE_KEY,
  );
}
