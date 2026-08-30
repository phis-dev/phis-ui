import { PHI_BUILDER_RUNTIME_CONTROLLER_SERVER_DEFINITION } from "./controller/server-definition";
import { PHI_BUILDER_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_BUILDER_RUNTIME_MODULE = {
  ...PHI_BUILDER_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_BUILDER_RUNTIME_CONTROLLER_SERVER_DEFINITION,
} satisfies PhiRuntimeModule;
