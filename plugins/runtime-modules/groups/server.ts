import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import {
  PHI_GROUPS_APP_RUNTIME_MODULE_FORMS,
  PHI_GROUPS_RUNTIME_MODULE_FORMS,
} from "../../../plugins/runtime-modules/groups/forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_GROUPS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_GROUPS_RUNTIME_MODULE_ROUTES } from "./presets";

/**
 * Admin and App carry different Forms of this module: the App surface is the member-facing half.
 * Without an Area, everything the module owns is contributed, which is what the Builder needs.
 */
export function createPhiGroupsRuntimeModuleServerAreaContribution(area?: PhiCmsAreaKey) {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_GROUPS_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_GROUPS_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      forms: area === "app"
        ? PHI_GROUPS_APP_RUNTIME_MODULE_FORMS
        : PHI_GROUPS_RUNTIME_MODULE_FORMS,
      layouts: [],
      routes: area
        ? PHI_GROUPS_RUNTIME_MODULE_ROUTES.filter((route) => route.area === area)
        : PHI_GROUPS_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_GROUPS_RUNTIME_MODULE),
    },
  });
}
