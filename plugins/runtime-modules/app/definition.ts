import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_APP_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "./forms";
import { PHI_APP_RUNTIME_MODULE_IDENTITY } from "./ids";
import {
  PHI_CORE_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_APP_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "app",
  ...PHI_APP_RUNTIME_MODULE_IDENTITY,
  serverBinding: PHI_CORE_SERVER_BINDING,
  description: "Locked App Area shell, navigation surfaces, and authenticated application routes.",
  category: "foundation",
  icon: "antd:appstore",
  formProviders: {
    handlers: PHI_APP_FORM_HANDLER_PROVIDER_DESCRIPTORS,
  },
});
