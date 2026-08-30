import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_FORMS } from "../../../plugins/runtime-modules/user-management/forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES } from "./presets";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      forms: PHI_USER_MANAGEMENT_RUNTIME_MODULE_FORMS,
      layouts: [],
      routes: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_USER_MANAGEMENT_RUNTIME_MODULE),
    },
  });
