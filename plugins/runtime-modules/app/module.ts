import { PHI_APP_BASE_CONTROLLER_DEFINITION } from "../../../components/runtime/area-base-controller-definitions";
import { PHI_APP_RUNTIME_MODULE_DEFINITION } from "../app/definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_APP_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_APP_RUNTIME_MODULE_DEFINITION,
  PHI_APP_BASE_CONTROLLER_DEFINITION,
);
