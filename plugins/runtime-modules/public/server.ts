import {
  PHI_AREA_BASE_RUNTIME_MODULE_AREA_SHELLS,
  PHI_AREA_BASE_RUNTIME_MODULE_ROUTES,
  PHI_PUBLIC_FORM_RUNTIME_MODULE_ROUTES,
} from "../area-base-presets";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_PUBLIC_RUNTIME_MODULE_DEFINITION } from "../public/definition";
import { PHI_PUBLIC_RUNTIME_MODULE_FORMS } from "../../../components/forms/shared-form-plugins";

/**
 * The unselectable base module of its Area. Shells and routes come from the shared Area-base preset
 * list and are filtered by owner, so each base module states its own half of it.
 */
export const PHI_PUBLIC_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_PUBLIC_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_PUBLIC_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],
      forms: PHI_PUBLIC_RUNTIME_MODULE_FORMS,
      areaShells: PHI_AREA_BASE_RUNTIME_MODULE_AREA_SHELLS.filter(
        (descriptor) => descriptor.ownerModuleId === PHI_PUBLIC_RUNTIME_MODULE_DEFINITION.moduleId,
      ),
      /*
       * The landing, the error Pages, the terms, and the contact page: what no Site can do without. Each
       * is a floor a package Module may cover (MODULES.md, "Who owns an address") -- the landing through
       * the root slot, the others through their path.
       */
      routes: PHI_AREA_BASE_RUNTIME_MODULE_ROUTES.filter(
        (descriptor) => descriptor.ownerModuleId === PHI_PUBLIC_RUNTIME_MODULE_DEFINITION.moduleId,
      ).concat(PHI_PUBLIC_FORM_RUNTIME_MODULE_ROUTES),
      load: () => import("./module").then((module) => module.PHI_PUBLIC_RUNTIME_MODULE),
    },
  });
