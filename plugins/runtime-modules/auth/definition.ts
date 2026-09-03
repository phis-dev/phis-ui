import {
  PHI_AUTH_CONTROLLER_DEFINITION,
} from "../../../components/runtime/area-base-controller-definitions";
import {
  PHI_AUTH_CONTROLLER_TYPE,
} from "../../../components/runtime/area-base-controller-addresses";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../auth/data-providers";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
  PHI_AUTH_FORM_HANDLER_PROVIDER_DESCRIPTORS,
} from "../../../components/forms/form-provider-contract";
import {
  PHI_CORE_AUTH_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_AUTH_RUNTIME_MODULE_DEFINITION = {
  moduleId: PHI_AUTH_RUNTIME_MODULE_ID,
  kind: "module",
  eligibleAreas: ["public", "admin", "app"],
  serverBinding: PHI_CORE_AUTH_SERVER_BINDING,
  controllerType: PHI_AUTH_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_AUTH_CONTROLLER_DEFINITION),
  title: "Auth",
  description: "Site login, mandatory authentication workflows, Admin settings, and App account security.",
  category: "people",
  icon: "antd:user-outlined",
  controllerMountPolicy: "area",
  authUiProvider: {
    providerKey: PHI_AUTH_CONTROLLER_TYPE,
    controllerType: PHI_AUTH_CONTROLLER_TYPE,
    capabilitiesByArea: {
      public: ["primary-login", "factor-challenge", "factor-enrollment", "recovery"],
      admin: ["site-settings"],
      app: ["primary-login", "account-security"],
    },
    accountSecurityPath: "/security",
  },
  formProviders: {
    fieldTypes: PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
    handlers: PHI_AUTH_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  },
  dataProviders: PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
