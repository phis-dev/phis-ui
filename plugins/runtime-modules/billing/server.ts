import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_BILLING_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_BILLING_RUNTIME_MODULE_FORMS } from "./forms";
import { PHI_BILLING_RUNTIME_MODULE_ROUTES } from "./presets";

/** One contribution for both its Areas: each keeps what names it (routes and Forms by their `area`). */
export function createPhiBillingRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_BILLING_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_BILLING_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],
      forms: PHI_BILLING_RUNTIME_MODULE_FORMS,
      routes: PHI_BILLING_RUNTIME_MODULE_ROUTES,
      uiProvider: true,
      load: () => import("./module").then((module) => module.PHI_BILLING_RUNTIME_MODULE),
    },
  });
}
