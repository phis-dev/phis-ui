import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_EDITOR_RUNTIME_MODULE_DEFINITION } from "./definition";
import {
  PHI_EDITOR_RUNTIME_MODULE_AREA_SHELLS,
  PHI_EDITOR_RUNTIME_MODULE_ROUTES,
} from "./presets";

export const PHI_EDITOR_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_EDITOR_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_EDITOR_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],
      areaShells: PHI_EDITOR_RUNTIME_MODULE_AREA_SHELLS,
      routes: PHI_EDITOR_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_EDITOR_RUNTIME_MODULE),
    },
  });
