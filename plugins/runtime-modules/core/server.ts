import { PHI_CORE_RUNTIME_MODULE_THEMES } from "../area-base-presets";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_CORE_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_RUNTIME_MODULE_LAYOUTS as PHI_CORE_LAYOUTS } from "./layouts";
import { PHI_RUNTIME_MODULE_WIDGETS as PHI_CORE_WIDGETS } from "./widgets";
import { PHI_CORE_MESSAGING_FORMS } from "./messaging/forms";

/** The one module every Area carries. It owns no Page of its own, so it contributes no route. */
export function createPhiCoreRuntimeModuleServerAreaContribution() {
  return definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_CORE_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_CORE_RUNTIME_MODULE_DEFINITION,
      widgets: PHI_CORE_WIDGETS,
      forms: PHI_CORE_MESSAGING_FORMS,
      layouts: PHI_CORE_LAYOUTS,
      themes: PHI_CORE_RUNTIME_MODULE_THEMES,
      /*
       * One Area only. Core reaches every Area there is, and a runtime figure is an operator's fact: on
       * an App Dashboard it would be something a visitor can read and nobody can act on.
       */
      dashboardCards: {
        areas: ["admin"],
        load: () => import("./cards").then((module) => module.PHI_CORE_RUNTIME_MODULE_DASHBOARD_CARDS),
      },
      load: () => import("./module").then((module) => module.PHI_CORE_RUNTIME_MODULE),
    },
  });
}
