import { PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/user-management/controller/definition";
import { PHI_USER_MANAGEMENT_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/user-management/controller/address";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_VIEWER_ACCESS_DEVELOPER_TOOLS } from "../../../types/access";
import { PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_USER_MANAGEMENT_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "../../../plugins/runtime-modules/user-management/forms";

export const PHI_USER_MANAGEMENT_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["admin"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  accessPolicy: PHI_VIEWER_ACCESS_DEVELOPER_TOOLS,
  controllerType: PHI_USER_MANAGEMENT_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_USER_MANAGEMENT_RUNTIME_CONTROLLER_DEFINITION),
  title: "User Management",
  description: "User, role, invite, and permission administration.",
  category: "user-management",
  iconFamily: "user-management",
  controllerMountPolicy: "demand",
  formProviders: { handlers: PHI_USER_MANAGEMENT_FORM_HANDLER_PROVIDER_DESCRIPTORS },
  dataProviders: PHI_USER_MANAGEMENT_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
