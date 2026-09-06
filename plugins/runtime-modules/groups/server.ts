import { PHI_GROUPS_RUNTIME_MODULE_FORMS } from "../../../plugins/runtime-modules/groups/forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_GROUPS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_GROUPS_RUNTIME_MODULE_ROUTES } from "./presets";

export function createPhiGroupsRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_GROUPS_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_GROUPS_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      forms: PHI_GROUPS_RUNTIME_MODULE_FORMS,
      layouts: [],
      routes: PHI_GROUPS_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_GROUPS_RUNTIME_MODULE),
    },
  });
}
