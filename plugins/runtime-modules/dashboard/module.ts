import { PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/dashboard/controller/definition";
import { PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_DASHBOARD_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION,
  PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION,
);
