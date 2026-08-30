import { PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/revisions/controller/definition";
import { PHI_REVISIONS_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/revisions/controller/address";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_REVISIONS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";

export const PHI_REVISIONS_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["builder"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_REVISIONS_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_REVISIONS_RUNTIME_CONTROLLER_DEFINITION),
  title: "Revisions",
  description: "Revision history, comparison, restore, deletion, and preset-version management.",
  category: "revisions",
  iconFamily: "revisions",
  controllerMountPolicy: "area",
  dataProviders: PHI_REVISIONS_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
