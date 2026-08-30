import { PHI_CORE_RUNTIME_CONTROLLER_DEFINITION } from "../../../components/runtime/core-runtime-controller-definition";
import { PHI_CORE_RUNTIME_MODULE_DEFINITION } from "./definition";
import type { PhiRuntimeModule } from "../contracts";

export const PHI_CORE_RUNTIME_MODULE = {
  ...PHI_CORE_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_CORE_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
