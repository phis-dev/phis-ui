import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_NEWS_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/news/controller`;
export const PHI_NEWS_CONTROLLER_KEY = "default";
export const PHI_NEWS_CONTROLLER_TYPE =
  `${PHI_NEWS_CONTROLLER_PLUGIN_KEY}/${PHI_NEWS_CONTROLLER_KEY}` as const;
export const PHI_NEWS_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiNewsControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_NEWS_CONTROLLER_PLUGIN_KEY,
    PHI_NEWS_CONTROLLER_KEY,
    PHI_NEWS_CONTROLLER_INSTANCE_KEY,
  );
}
