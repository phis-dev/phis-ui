import { PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/admin/controller/definition";
import { PHI_ADMIN_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/admin/controller/address";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_ADMIN_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "../../../plugins/runtime-modules/admin/forms";

export const PHI_ADMIN_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "admin",
  moduleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_ADMIN_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_ADMIN_RUNTIME_CONTROLLER_DEFINITION),
  description: "Locked Admin Area shell, navigation surface, root route, and Admin settings.",
  category: "foundation",
  iconFamily: "admin",
  controllerMountPolicy: "area",
  formProviders: { handlers: PHI_ADMIN_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTORS },
});
