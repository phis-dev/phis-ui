import { PHI_CORE_RUNTIME_MODULE_THEMES } from "../area-base-presets";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_CORE_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_RUNTIME_MODULE_LAYOUTS as PHI_CORE_LAYOUTS } from "./layouts";
import { PHI_RUNTIME_MODULE_WIDGETS as PHI_CORE_WIDGETS } from "./widgets";

/** The one module every Area carries. It owns no Page of its own, so it contributes no route. */
export function createPhiCoreRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_CORE_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_CORE_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_CORE_WIDGETS,
      layouts: PHI_CORE_LAYOUTS,
      themes: PHI_CORE_RUNTIME_MODULE_THEMES,
      load: () => import("./module").then((module) => module.PHI_CORE_RUNTIME_MODULE),
    },
  });
}
