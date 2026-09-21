import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_THREADS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_THREADS_RUNTIME_MODULE_WIDGETS } from "./widgets";
import { PHI_THREADS_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_THREADS_RUNTIME_MODULE_FORMS } from "./forms";

export function createPhiThreadsRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_THREADS_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_THREADS_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_THREADS_RUNTIME_MODULE_WIDGETS,
      forms: PHI_THREADS_RUNTIME_MODULE_FORMS,
      layouts: [],
      areaOverlays: [],
      routes: PHI_THREADS_RUNTIME_MODULE_ROUTES,
      navigation: [],
      load: () => import("./module").then((module) => module.PHI_THREADS_RUNTIME_MODULE),
    },
  });
}
