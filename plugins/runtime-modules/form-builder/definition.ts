import { PHI_FORM_BUILDER_CONTROLLER_DEFINITION } from "../../../components/forms/form-builder-controller-definition";
import { PHI_FORM_BUILDER_CONTROLLER_TYPE } from "../../../components/forms/form-builder-controller-address";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_FORM_BUILDER_RUNTIME_MODULE_ID } from "./ids";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

export const PHI_FORM_BUILDER_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_FORM_BUILDER_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["builder"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_FORM_BUILDER_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_FORM_BUILDER_CONTROLLER_DEFINITION),
  title: "Form Builder",
  description: "Optional client-only form-definition authoring lifecycle.",
  category: "content",
  iconFamily: "forms",
  controllerMountPolicy: "area",
} satisfies PhiRuntimeModuleDefinition;
