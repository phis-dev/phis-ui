import { PHI_ADMIN_RUNTIME_MODULE_FORMS } from "../../../plugins/runtime-modules/admin/forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_ADMIN_RUNTIME_MODULE_DEFINITION } from "./definition";
import {
  PHI_ADMIN_RUNTIME_MODULE_AREA_SHELLS,
  PHI_ADMIN_RUNTIME_MODULE_ROUTES,
} from "./presets";
import { PHI_RUNTIME_MODULE_WIDGETS } from "./widgets";

export const PHI_ADMIN_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_ADMIN_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_ADMIN_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_RUNTIME_MODULE_WIDGETS,
      forms: PHI_ADMIN_RUNTIME_MODULE_FORMS,
      layouts: [],
      areaShells: PHI_ADMIN_RUNTIME_MODULE_AREA_SHELLS,
      routes: PHI_ADMIN_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_ADMIN_RUNTIME_MODULE),
    },
  });
