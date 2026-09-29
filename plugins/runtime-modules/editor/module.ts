import { PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/editor/controller/definition";
import { PHI_EDITOR_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_EDITOR_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_EDITOR_RUNTIME_MODULE_DEFINITION,
  PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION,
);
