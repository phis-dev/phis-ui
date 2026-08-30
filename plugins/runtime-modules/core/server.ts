import type { PhiCmsRoutePresetDescriptor } from "../../../types/cms-module-descriptors";
import { PHI_CORE_RUNTIME_MODULE_THEMES } from "../area-base-presets";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_CORE_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_RUNTIME_MODULE_LAYOUTS as PHI_CORE_LAYOUTS } from "./layouts";
import { PHI_RUNTIME_MODULE_WIDGETS as PHI_CORE_WIDGETS } from "./widgets";

/**
 * The one module every Area carries. Its routes are handed in rather than filtered: core owns no
 * Pages of its own, and an Area that wants one names it.
 */
export function createPhiCoreRuntimeModuleServerAreaContribution(
  routes?: readonly PhiCmsRoutePresetDescriptor[],
) {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_CORE_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_CORE_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_CORE_WIDGETS,
      layouts: PHI_CORE_LAYOUTS,
      routes,
      themes: PHI_CORE_RUNTIME_MODULE_THEMES,
      load: () => import("./module").then((module) => module.PHI_CORE_RUNTIME_MODULE),
    },
  });
}
