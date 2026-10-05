import {
  PHI_AUTH_CONTROLLER_DEFINITION,
} from "./controller/definition";
import {
  PHI_AUTH_CONTROLLER_TYPE,
} from "./controller/address";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../auth/data-providers";
import { buildPhiRuntimeModuleControllerDescriptor } from "../contracts";
import { PHI_AUTH_RUNTIME_MODULE_IDENTITY } from "./ids";
import { PHI_AUTH_LOGIN_OVERLAY_IDS } from "./overlay-ids";
import {
  PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
  PHI_AUTH_FORM_HANDLER_PROVIDER_DESCRIPTORS,
} from "./form-providers";
import {
  PHI_CORE_AUTH_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_AUTH_RUNTIME_MODULE_DEFINITION = {
  ...PHI_AUTH_RUNTIME_MODULE_IDENTITY,
  kind: "module",
  eligibleAreas: ["public", "admin", "app"],
  serverBinding: PHI_CORE_AUTH_SERVER_BINDING,
  controllerType: PHI_AUTH_CONTROLLER_TYPE,
  controller: buildPhiRuntimeModuleControllerDescriptor(PHI_AUTH_CONTROLLER_DEFINITION),
  title: "Auth",
  description: "Site login, mandatory authentication workflows, Admin settings, and App account security.",
  category: "identity",
  icon: "antd:safety-certificate",
  /*
   * Mounted where signing in happens, not on every page of the Area: with the login Overlay's zones
   * when it opens, and on the sign-in Pages that place the Login (the step Widget asks for it). The
   * Account Widget opens the Overlay itself, so nothing on an ordinary page needs this Controller.
   */
  controllerMountPolicy: "demand",
  authUiProvider: {
    providerKey: PHI_AUTH_CONTROLLER_TYPE,
    controllerType: PHI_AUTH_CONTROLLER_TYPE,
    capabilitiesByArea: {
      public: ["primary-login", "factor-challenge", "factor-enrollment", "recovery"],
      admin: ["site-settings"],
      app: ["primary-login"],
    },
    loginOverlayByArea: {
      public: PHI_AUTH_LOGIN_OVERLAY_IDS.public.overlayLogin,
      app: PHI_AUTH_LOGIN_OVERLAY_IDS.app.overlayLogin,
    },
  },
  formProviders: {
    fieldTypes: PHI_AUTH_FORM_FIELD_TYPE_PROVIDER_DESCRIPTORS,
    handlers: PHI_AUTH_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  },
  dataProviders: PHI_AUTH_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
