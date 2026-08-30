import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_THEME_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_THEME_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_RUNTIME_MODULE_WIDGETS as PHI_THEME_WIDGETS } from "./widgets";

export const PHI_THEME_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_THEME_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_THEME_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_THEME_WIDGETS,
      layouts: [],
      routes: PHI_THEME_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_THEME_RUNTIME_MODULE),
    },
  });
