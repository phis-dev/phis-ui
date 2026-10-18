import { PHI_CMS_AREA_KEYS } from "../../../constants/cms-areas";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_TOUR_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_TOUR_CONTROLLER_TYPE } from "./controller/address";
import { PHI_TOUR_PROGRESS_USER_STATE_KEY, PHI_TOUR_RUNTIME_MODULE_ID } from "./ids";

/**
 * Offers the Tours the Site's Pages carry (design/TOURS.md, "Decided direction").
 *
 * It owns no Tour. A Tour belongs to the Module that owns the Page, which attaches it to its route
 * preset; the foundation -- visual anchors, `PhiTourControl`, the Page hand-over -- is Core's. What this
 * Module brings is the button a Site places in its Shell and the Controller behind it, so switching it
 * off takes both away and leaves every Tour where it is, unoffered.
 */
export const PHI_TOUR_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_TOUR_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: PHI_CMS_AREA_KEYS,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_TOUR_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_TOUR_RUNTIME_CONTROLLER_DEFINITION),
  controllerMountPolicy: "area",
  title: "Tours",
  description: "Guided Tours of the Site's Pages, started from a button in the Shell.",
  category: "workspace",
  icon: "antd:question-circle",
  userState: [
    { key: PHI_TOUR_PROGRESS_USER_STATE_KEY, shape: "value", valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.tourProgress },
  ],
} satisfies PhiRuntimeModuleDefinition;
