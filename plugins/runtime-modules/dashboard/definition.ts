import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import { PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/dashboard/controller/definition";
import { PHI_DASHBOARD_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/dashboard/controller/address";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

export const PHI_DASHBOARD_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["admin", "builder"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_DASHBOARD_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_DASHBOARD_RUNTIME_CONTROLLER_DEFINITION),
  title: "Dashboard",
  description: "Area-specific Dashboard routes and Dashboard projection orchestration.",
  category: "workspace",
  iconFamily: "dashboard",
  controllerMountPolicy: "area",
} satisfies PhiRuntimeModuleDefinition;
