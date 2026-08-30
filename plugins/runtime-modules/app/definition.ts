import {
  PHI_APP_BASE_CONTROLLER_DEFINITION,
} from "../../../components/runtime/area-base-controller-definitions";
import {
  PHI_APP_BASE_CONTROLLER_TYPE,
} from "../../../components/runtime/area-base-controller-addresses";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_APP_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_CORE_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_APP_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "app",
  moduleId: PHI_APP_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_APP_BASE_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_APP_BASE_CONTROLLER_DEFINITION),
  description: "Locked App Area shell, navigation surfaces, and authenticated application routes.",
  category: "app",
  icon: "antd:appstore",
  controllerMountPolicy: "area",
});
