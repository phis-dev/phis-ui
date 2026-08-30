import { PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/groups/controller/definition";
import type { PhiRuntimeModule } from "../contracts";
import { PHI_GROUPS_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_GROUPS_RUNTIME_MODULE = {
  ...PHI_GROUPS_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
