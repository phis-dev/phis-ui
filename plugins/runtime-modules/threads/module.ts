import type { PhiRuntimeModule } from "../contracts";
import { PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_THREADS_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_THREADS_RUNTIME_MODULE = {
  ...PHI_THREADS_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_THREADS_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
