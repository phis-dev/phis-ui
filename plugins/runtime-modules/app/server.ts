import {
  PHI_AREA_BASE_RUNTIME_MODULE_AREA_SHELLS,
  PHI_AREA_BASE_RUNTIME_MODULE_ROUTES,
} from "../area-base-presets";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_APP_RUNTIME_MODULE_DEFINITION } from "../app/definition";

/**
 * The unselectable base module of its Area. Shells and routes come from the shared Area-base preset
 * list and are filtered by owner, so each base module states its own half of it.
 */
export const PHI_APP_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_APP_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_APP_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],

      areaShells: PHI_AREA_BASE_RUNTIME_MODULE_AREA_SHELLS.filter(
        (descriptor) => descriptor.ownerModuleId === PHI_APP_RUNTIME_MODULE_DEFINITION.moduleId,
      ),
      routes: PHI_AREA_BASE_RUNTIME_MODULE_ROUTES.filter(
        (descriptor) => descriptor.ownerModuleId === PHI_APP_RUNTIME_MODULE_DEFINITION.moduleId,
      ),
      load: () => import("./module").then((module) => module.PHI_APP_RUNTIME_MODULE),
    },
  });
