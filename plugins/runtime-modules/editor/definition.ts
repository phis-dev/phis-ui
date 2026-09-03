import { PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/editor/controller/definition";
import { PHI_EDITOR_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/editor/controller/address";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

export const PHI_EDITOR_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "editor",
  moduleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_EDITOR_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_EDITOR_RUNTIME_CONTROLLER_DEFINITION),
  description: "Locked Editor Area shell, content editor widgets, data, and workflows.",
  category: "foundation",
  iconFamily: "editor",
  controllerMountPolicy: "area",
});
