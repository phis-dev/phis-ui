import {
  PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION,
} from "../../../components/runtime/area-base-controller-definitions";
import {
  PHI_ACCOUNTING_BASE_CONTROLLER_TYPE,
} from "../../../components/runtime/area-base-controller-addresses";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_CORE_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "accounting",
  moduleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_ACCOUNTING_BASE_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_ACCOUNTING_BASE_CONTROLLER_DEFINITION),
  description: "Locked Accounting Area shell, navigation surface, and accounting workspace route.",
  category: "accounting",
  icon: "antd:profile",
  controllerMountPolicy: "area",
});
