import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_TOUR_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_TOUR_RUNTIME_MODULE_WIDGETS } from "./widgets";

export function createPhiTourRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_TOUR_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_TOUR_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_TOUR_RUNTIME_MODULE_WIDGETS,
      layouts: [],
      routes: [],
      load: () => import("./module").then((module) => module.PHI_TOUR_RUNTIME_MODULE),
    },
  });
}
