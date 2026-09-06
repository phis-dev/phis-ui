import { PHI_LOCALIZATION_RUNTIME_MODULE_FORMS } from "../../../plugins/runtime-modules/localization/forms";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ROUTES } from "./presets";

export function createPhiLocalizationRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      forms: PHI_LOCALIZATION_RUNTIME_MODULE_FORMS,
      layouts: [],
      routes: PHI_LOCALIZATION_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_LOCALIZATION_RUNTIME_MODULE),
    },
  });
}
