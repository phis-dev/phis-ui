import { PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/revisions/controller/definition";
import { PHI_REVISIONS_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_REVISIONS_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_REVISIONS_RUNTIME_MODULE_DEFINITION,
  PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION,
);
