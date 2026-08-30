import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_FORM_BUILDER_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],
      load: () => import("./module").then((module) => module.PHI_FORM_BUILDER_RUNTIME_MODULE),
    },
  });
