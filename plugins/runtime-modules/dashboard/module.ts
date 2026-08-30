import { PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/dashboard/controller/definition";
import { PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_DASHBOARD_RUNTIME_MODULE = {
  ...PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
