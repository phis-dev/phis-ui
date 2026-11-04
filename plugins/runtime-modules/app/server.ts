import {
  PHI_APP_RUNTIME_MODULE_AREA_SHELLS,
  PHI_APP_RUNTIME_MODULE_ROUTES,
} from "./presets";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_APP_RUNTIME_MODULE_DEFINITION } from "../app/definition";
import { PHI_APP_RUNTIME_MODULE_FORMS } from "./forms";

/** The unselectable base module of its Area. Its shell and Pages are its own (`./presets`). */
export const PHI_APP_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_APP_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_APP_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      forms: PHI_APP_RUNTIME_MODULE_FORMS,
      layouts: [],

      areaShells: PHI_APP_RUNTIME_MODULE_AREA_SHELLS,
      routes: PHI_APP_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_APP_RUNTIME_MODULE),
    },
  });
