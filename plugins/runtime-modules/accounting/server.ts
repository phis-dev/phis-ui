import {
  PHI_ACCOUNTING_RUNTIME_MODULE_AREA_SHELLS,
  PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES,
} from "./presets";
import { definePhiRuntimeModuleServerAreaContribution } from "../area-contributions";
import { PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION } from "../accounting/definition";

/** The unselectable base module of its Area. Its shell and Pages are its own (`./presets`). */
export const PHI_ACCOUNTING_RUNTIME_MODULE_SERVER_AREA_CONTRIBUTION =
  definePhiRuntimeModuleServerAreaContribution({
    moduleId: PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION.moduleId,
    catalogEntry: {
      definition: PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION,
      widgets: [],
      layouts: [],

      areaShells: PHI_ACCOUNTING_RUNTIME_MODULE_AREA_SHELLS,
      routes: PHI_ACCOUNTING_RUNTIME_MODULE_ROUTES,
      load: () => import("./module").then((module) => module.PHI_ACCOUNTING_RUNTIME_MODULE),
    },
  });
