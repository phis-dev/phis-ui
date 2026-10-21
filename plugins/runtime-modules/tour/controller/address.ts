import { PHI_TOUR_CONTROLLER_KEY, PHI_TOUR_CONTROLLER_PLUGIN_KEY } from "../../../../types/tour-controller";

// The Controller's address is the foundation's (`types/tour-controller.ts`): the Tour button, which is Core's, asks it.
export const PHI_TOUR_CONTROLLER_TYPE =
  `${PHI_TOUR_CONTROLLER_PLUGIN_KEY}/${PHI_TOUR_CONTROLLER_KEY}` as const;
