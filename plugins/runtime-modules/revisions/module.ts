import { PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/revisions/controller/definition";
import type { PhiRuntimeModule } from "../contracts";
import { PHI_REVISIONS_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_REVISIONS_RUNTIME_MODULE = {
  ...PHI_REVISIONS_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
