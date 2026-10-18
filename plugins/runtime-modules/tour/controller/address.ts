import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "../../../../types/signals";

export const PHI_TOUR_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/tour/controller`;
export const PHI_TOUR_CONTROLLER_KEY = "default";
export const PHI_TOUR_CONTROLLER_TYPE =
  `${PHI_TOUR_CONTROLLER_PLUGIN_KEY}/${PHI_TOUR_CONTROLLER_KEY}` as const;
const PHI_TOUR_CONTROLLER_INSTANCE_KEY = "default";

export function createPhiTourControllerAddress() {
  return createPhiControllerSignalAddress(
    PHI_TOUR_CONTROLLER_PLUGIN_KEY,
    PHI_TOUR_CONTROLLER_KEY,
    PHI_TOUR_CONTROLLER_INSTANCE_KEY,
  );
}
