import { PHI_SHARED_PACKAGE_NAME, createPhiControllerSignalAddress } from "./signals";

// Apart from `types/tours.ts`, so the Tour button, placed in every Area, carries the address and not the
// Tour definition's checks.

/**
 * Where a Tour is asked for: the Tour Controller of the Area, which the Tour Module mounts.
 *
 * Here, in the foundation, rather than in that Module: the Tour button is Core's, so any Area -- and any
 * Module's own Page -- can place it without depending on the Tour Module. With the Module off nobody
 * answers at this address, and the button, never told that a Tour is there, stays hidden.
 */
export const PHI_TOUR_CONTROLLER_PLUGIN_KEY = `${PHI_SHARED_PACKAGE_NAME}/modules/tour/controller`;
export const PHI_TOUR_CONTROLLER_KEY = "default";
export const PHI_TOUR_CONTROLLER_ADDRESS = createPhiControllerSignalAddress(
  PHI_TOUR_CONTROLLER_PLUGIN_KEY,
  PHI_TOUR_CONTROLLER_KEY,
  "default",
);
