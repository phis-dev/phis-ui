import { PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/user-management/controller/definition";
import type { PhiRuntimeModule } from "../contracts";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE = {
  ...PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
