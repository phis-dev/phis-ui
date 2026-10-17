import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_BLOG_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_BLOG_RUNTIME_MODULE_FORMS } from "./forms";
import { PHI_BLOG_RUNTIME_MODULE_ROUTES } from "./presets";

export function createPhiBlogRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_BLOG_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_BLOG_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],
      forms: PHI_BLOG_RUNTIME_MODULE_FORMS,
      routes: PHI_BLOG_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_BLOG_RUNTIME_MODULE),
    },
  });
}
