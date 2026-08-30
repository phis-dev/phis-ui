import { PHI_THEME_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/theme/controller/definition";
import { PHI_THEME_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_THEME_RUNTIME_MODULE = {
  ...PHI_THEME_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_THEME_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
