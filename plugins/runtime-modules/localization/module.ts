import { PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/localization/controller/definition";
import type { PhiRuntimeModule } from "../contracts";
import { PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_LOCALIZATION_RUNTIME_MODULE = {
  ...PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
