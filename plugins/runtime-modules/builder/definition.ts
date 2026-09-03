import { PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION } from "./controller/definition";
import { PHI_BUILDER_CONTROLLER_TYPE } from "./controller/address";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

export const PHI_BUILDER_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "builder",
  moduleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_BUILDER_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_BUILDER_RUNTIME_CONTROLLER_DEFINITION),
  description: "Locked Builder Area shell, workspaces, Canvas orchestration, drafts, Inspector, wiring, and authoring chrome.",
  category: "foundation",
  iconFamily: "builder",
  controllerMountPolicy: "area",
  dataProviders: PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
});
