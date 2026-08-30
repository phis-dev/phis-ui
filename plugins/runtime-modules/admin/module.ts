import { PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/admin/controller/definition";
import { PHI_ADMIN_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_ADMIN_RUNTIME_MODULE = {
  ...PHI_ADMIN_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
