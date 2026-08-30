import { PHI_REVISIONS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_REVISIONS_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_REVISIONS_RUNTIME_MODULE_WIDGETS } from "./widgets";

export const PHI_REVISIONS_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_REVISIONS_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_REVISIONS_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_REVISIONS_RUNTIME_MODULE_WIDGETS,
      layouts: [],
      routes: PHI_REVISIONS_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_REVISIONS_RUNTIME_MODULE),
    },
  });
