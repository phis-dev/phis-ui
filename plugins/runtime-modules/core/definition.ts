import { PHI_CORE_RUNTIME_CONTROLLER_DEFINITION } from "../../../components/runtime/core-runtime-controller-definition";
import { PHI_CORE_RUNTIME_CONTROLLER_TYPE } from "../../../components/runtime/core-runtime-controller-address";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_CORE_RUNTIME_MODULE_ID } from "./ids";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import { PHI_CMS_AREA_KEYS } from "../../../constants/cms-areas";
import { PHI_CORE_FORM_PROVIDER_DESCRIPTORS } from "../../../components/forms/form-provider-contract";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_CORE_CALENDAR_ADAPTER_DESCRIPTORS } from "../runtime-calendar-adapters";

export const PHI_CORE_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_CORE_RUNTIME_MODULE_ID,
  kind: "platform",
  eligibleAreas: PHI_CMS_AREA_KEYS,
  serverBinding: PHI_CORE_SERVER_BINDING,
  controllerType: PHI_CORE_RUNTIME_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_CORE_RUNTIME_CONTROLLER_DEFINITION),
  title: "Core Runtime",
  description: "Required generic Phi CMS runtime, widgets, layouts, and signaling infrastructure.",
  category: "runtime",
  iconFamily: "runtime",
  controllerMountPolicy: "site",
  dataProviders: PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
  formProviders: PHI_CORE_FORM_PROVIDER_DESCRIPTORS,
  calendarAdapters: PHI_CORE_CALENDAR_ADAPTER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
