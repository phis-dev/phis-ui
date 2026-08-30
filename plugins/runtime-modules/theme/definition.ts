import { PHI_THEME_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/theme/controller/definition";
import { PHI_THEME_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/theme/controller/address";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_THEME_RUNTIME_MODULE_ID } from "./ids";
import { PHI_THEME_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

export const PHI_THEME_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_THEME_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["builder"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_THEME_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_THEME_RUNTIME_CONTROLLER_DEFINITION),
  title: "Theme",
  description: "Theme, brand, palette, and typography editing orchestration.",
  category: "theme",
  iconFamily: "theme",
  controllerMountPolicy: "area",
  dataProviders: PHI_THEME_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
