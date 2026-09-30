import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_NEWS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_NEWS_RUNTIME_MODULE_FORMS } from "./forms";
import { PHI_NEWS_RUNTIME_MODULE_ROUTES } from "./presets";
import { PHI_NEWS_RUNTIME_MODULE_WIDGETS } from "./widgets";

export function createPhiNewsRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_NEWS_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_NEWS_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_NEWS_RUNTIME_MODULE_WIDGETS,
      layouts: [],
      forms: PHI_NEWS_RUNTIME_MODULE_FORMS,
      routes: PHI_NEWS_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_NEWS_RUNTIME_MODULE),
    },
  });
}
