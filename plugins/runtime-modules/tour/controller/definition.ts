import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../types/signals";
import type { PhiRuntimeControllerDefinition } from "../../../../types/cms-plugins";
import {
  PHI_PAGE_TOUR_CONFIG_KEY,
  PHI_PAGE_TOUR_CONTROLLER_FLAG,
  readPhiResolvedPageTour,
  type PhiResolvedPageTour,
} from "../../../../types/tours";
import { PHI_TOUR_CONTROLLER_KEY, PHI_TOUR_CONTROLLER_PLUGIN_KEY } from "./address";

export type PhiTourControllerConfig = {
  /** The shown Page's Tour, handed on by the Page resolution while that Page is shown; `null` for none. */
  pageTour: PhiResolvedPageTour | null;
};

/**
 * Runs the Tour of whichever Page is shown (design/TOURS.md).
 *
 * The Area mounts it once, and every Page that carries a Tour hands it in as a Page overlay of this
 * config -- the `pageTour` flag is what tells the Page resolution that this Controller takes it. From
 * there it is the whole workflow: whether a Tour is available, starting one when the button asks or once
 * on a first visit, waiting for each step's target, and keeping the viewer's progress.
 */
export const PHI_TOUR_RUNTIME_CONTROLLER_DEFINITION = {
  kind: "controller",
  pluginKey: PHI_TOUR_CONTROLLER_PLUGIN_KEY,
  key: PHI_TOUR_CONTROLLER_KEY,
  title: "Tour Controller",
  description: "Offers and runs the Tour of the shown Page, and keeps where each person stands in it.",
  iconFamily: "tour",
  flags: [PHI_PAGE_TOUR_CONTROLLER_FLAG],
  allowedMountScopes: ["area"],
  runtimeSignals: {
    emits: [
      /*
       * Whether the shown Page has a Tour, to whoever offers one -- broadcast, because the button is
       * placed by the Site and this Controller does not know where. Said again whenever it is asked, so a
       * button that mounts late is not left guessing.
       */
      {
        id: "availability",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tourAvailability,
      },
    ],
    listens: [
      { id: "tourOpen", channel: "tour", action: "open", valueType: "none" },
      { id: "availabilityRequest", channel: "tour", action: "reload", valueType: "none" },
    ],
  },
  defaultConfig: { pageTour: null },
  parseConfig: (raw) => ({ pageTour: readPhiResolvedPageTour(raw[PHI_PAGE_TOUR_CONFIG_KEY]) }),
} satisfies PhiRuntimeControllerDefinition<PhiTourControllerConfig>;
