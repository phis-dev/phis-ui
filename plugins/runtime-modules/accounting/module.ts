import { PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION } from "../../../components/runtime/area-base-controller-definitions";
import { PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION } from "../accounting/definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_ACCOUNTING_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION,
  PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION,
);
