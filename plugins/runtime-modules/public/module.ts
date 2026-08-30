import { PHI_PUBLIC_BASE_CONTROLLER_DEFINITION } from "../../../components/runtime/area-base-controller-definitions";
import { PHI_PUBLIC_RUNTIME_MODULE_DEFINITION } from "../public/definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_PUBLIC_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_PUBLIC_RUNTIME_MODULE_DEFINITION,
  PHI_PUBLIC_BASE_CONTROLLER_DEFINITION,
);
