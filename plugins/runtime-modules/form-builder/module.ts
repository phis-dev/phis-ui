import { PHI_FORM_BUILDER_CONTROLLER_DEFINITION } from "../../../components/forms/form-builder-controller-definition";
import type { PhiRuntimeModule } from "../contracts";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_FORM_BUILDER_RUNTIME_MODULE = {
  ...PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION,
  controllerDefinition: PHI_FORM_BUILDER_CONTROLLER_DEFINITION,
} satisfies PhiRuntimeModule;
