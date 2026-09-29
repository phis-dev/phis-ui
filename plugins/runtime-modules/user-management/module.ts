import { PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/user-management/controller/definition";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION,
  PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION,
);
