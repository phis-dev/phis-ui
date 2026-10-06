import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_ADMIN_RUNTIME_MODULE_IDENTITY } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_ADMIN_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "../../../plugins/runtime-modules/admin/forms";

export const PHI_ADMIN_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "admin",
  ...PHI_ADMIN_RUNTIME_MODULE_IDENTITY,
  serverBinding: PHI_CORE_SERVER_BINDING,
  description: "Locked Admin Area shell, navigation surface, root route, and Admin settings.",
  category: "foundation",
  iconFamily: "admin",
  formProviders: { handlers: PHI_ADMIN_SETTINGS_FORM_HANDLER_PROVIDER_DESCRIPTORS },
});
