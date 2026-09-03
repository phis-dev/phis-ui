import {
  PHI_PUBLIC_BASE_CONTROLLER_DEFINITION,
} from "../../../components/runtime/area-base-controller-definitions";
import {
  PHI_PUBLIC_BASE_CONTROLLER_TYPE,
} from "../../../components/runtime/area-base-controller-addresses";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_PUBLIC_FORM_HANDLER_PROVIDER_DESCRIPTORS,
} from "../../../components/forms/form-provider-contract";
import {
  PHI_CORE_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_PUBLIC_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "public",
  moduleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_PUBLIC_BASE_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_PUBLIC_BASE_CONTROLLER_DEFINITION),
  description: "Locked Public Area shell, navigation surfaces, root routes, and public form handlers.",
  category: "foundation",
  icon: "antd:global",
  controllerMountPolicy: "area",
  formProviders: { handlers: PHI_PUBLIC_FORM_HANDLER_PROVIDER_DESCRIPTORS },
});
