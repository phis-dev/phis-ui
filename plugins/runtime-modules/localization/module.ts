import { PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/localization/controller/definition";
import { PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_LOCALIZATION_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION,
  PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION,
);
