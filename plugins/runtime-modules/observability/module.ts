import type { PhiRuntimeModule } from "../contracts";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION } from "./definition";
import { PHI_OBSERVABILITY_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/observability/controller/definition";

export const PHI_OBSERVABILITY_RUNTIME_MODULE = {
  ...PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_OBSERVABILITY_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
