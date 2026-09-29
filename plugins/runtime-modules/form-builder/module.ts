import { PHI_FORM_BUILDER_CONTROLLER_DEFINITION } from "../../../components/forms/form-builder-controller-definition";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION } from "./definition";
import { createPhiAreaBaseRuntimeModule } from "../area-base-module";

export const PHI_FORM_BUILDER_RUNTIME_MODULE = createPhiAreaBaseRuntimeModule(
  PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION,
  PHI_FORM_BUILDER_CONTROLLER_DEFINITION,
);
