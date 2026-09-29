import { PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/admin/controller/definition";
import { PHI_ADMIN_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_ADMIN_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_ADMIN_RUNTIME_MODULE_DEFINITION,
  PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION,
);
