import { PHI_THEME_RUNTIME_CONTROLLER_SERVER_DEFINITION } from "./controller/server-definition";
import { PHI_THEME_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_THEME_RUNTIME_MODULE = {
  ...PHI_THEME_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_THEME_RUNTIME_CONTROLLER_SERVER_DEFINITION,
} satisfies PhiRuntimeModule;
