import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ROUTES } from "./presets";

export const PHI_OBSERVABILITY_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],
      routes: PHI_OBSERVABILITY_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_OBSERVABILITY_RUNTIME_MODULE),
    },
  });
