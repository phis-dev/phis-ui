import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_VIEWER_ACCESS_DEVELOPER_TOOLS } from "../../../types/access";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_OBSERVABILITY_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/observability/controller/address";
import { PHI_OBSERVABILITY_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/observability/controller/definition";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";

export const PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_OBSERVABILITY_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["admin"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_OBSERVABILITY_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_OBSERVABILITY_RUNTIME_CONTROLLER_DEFINITION),
  controllerMountPolicy: "demand",
  accessPolicy: PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  title: "Observability",
  description: "Site-runtime log administration.",
  category: "observability",
  iconFamily: "observability",
  dataProviders: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
