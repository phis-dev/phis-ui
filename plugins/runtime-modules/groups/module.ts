import { PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/groups/controller/definition";
import { PHI_GROUPS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_GROUPS_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_GROUPS_RUNTIME_MODULE_DEFINITION,
  PHI_GROUPS_RUNTIME_CONTROLLER_DEFINITION,
);
