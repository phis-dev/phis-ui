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
  category: "identity",
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
    accountSecurityPath: "/settings/security",
    /*
     * The profile is no longer this Module's, and this line goes with the Account Widget's own entry
     * for it: once the menu reads the `app:account` surface, the entry names its route preset like
     * any other and nothing has to be told an address. Kept until then so the entry does not vanish
     * for the length of one step; it resolves to the same Page either way, both being `@phis/ui`.
     */
    accountProfilePath: "/settings/profile",
    logoutPath: "/logout",
  },
  formProviders: {
    fieldTypes: PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
    handlers: PHI_AUTH_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  },
  dataProviders: PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
