import { PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/editor/controller/definition";
import { PHI_EDITOR_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_EDITOR_RUNTIME_MODULE = {
  ...PHI_EDITOR_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
