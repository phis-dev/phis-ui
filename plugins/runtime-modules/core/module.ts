import { PHI_CORE_RUNTIME_CONTROLLER_DEFINITION } from "../../../components/runtime/core-runtime-controller-definition";
import { PHI_CORE_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_CORE_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_CORE_RUNTIME_MODULE_DEFINITION,
  PHI_CORE_RUNTIME_CONTROLLER_DEFINITION,
);
