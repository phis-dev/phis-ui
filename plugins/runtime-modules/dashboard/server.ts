import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_DASHBOARD_RUNTIME_MODULE_ROUTES } from "./presets";

/**
 * What this module contributes to one Area.
 *
 * The Area file says which modules an Area carries; the module says what it carries in. Before this,
 * every Area file restated a module's definition, routes and load edge, so adding a route meant
 * editing files that belong to other modules.
 *
 * Every route the module owns is contributed; the Area catalog keeps the ones addressed to it.
 */
export function createPhiDashboardRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],
      routes: PHI_DASHBOARD_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_DASHBOARD_RUNTIME_MODULE),
    },
  });
}
