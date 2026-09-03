import { PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION } from "../../../plugins/runtime-modules/localization/controller/definition";
import { PHI_LOCALIZATION_CONTROLLER_TYPE } from "../../../plugins/runtime-modules/localization/controller/address";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_LOCALIZATION_RUNTIME_MODULE_ID } from "./ids";
import { PHI_LOCALIZATION_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "../../../plugins/runtime-modules/localization/forms";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_VIEWER_ACCESS_CONTENT_EDITING } from "../../../types/access";
import { PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";

export const PHI_LOCALIZATION_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["admin", "editor"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  accessPolicy: PHI_VIEWER_ACCESS_CONTENT_EDITING,
  controllerType: PHI_LOCALIZATION_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_LOCALIZATION_RUNTIME_CONTROLLER_DEFINITION),
  title: "Localization",
  description: "Locale and translation administration.",
  category: "operations",
  iconFamily: "localization",
  controllerMountPolicy: "area",
  formProviders: { handlers: PHI_LOCALIZATION_FORM_HANDLER_PROVIDER_DESCRIPTORS },
  dataProviders: PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
