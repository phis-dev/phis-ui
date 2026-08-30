import { PHI_AUTH_CONTROLLER_SERVER_DEFINITION } from "../../../components/runtime/auth-controller-server-definition";
import { PHI_AUTH_RUNTIME_MODULE_DEFINITION } from "../auth/definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_AUTH_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_AUTH_RUNTIME_MODULE_DEFINITION,
  PHI_AUTH_CONTROLLER_SERVER_DEFINITION,
);
