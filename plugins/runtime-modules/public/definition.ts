import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_PUBLIC_RUNTIME_MODULE_ID } from "./ids";
import { PHI_PUBLIC_FORM_HANDLER_PROVIDER_DESCRIPTORS } from "./form-providers";
import {
  PHI_CORE_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_PUBLIC_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "public",
  moduleId: PHI_PUBLIC_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  description: "Locked Public Area shell, navigation surfaces, root routes, and public form handlers.",
  category: "foundation",
  icon: "antd:global",
  formProviders: { handlers: PHI_PUBLIC_FORM_HANDLER_PROVIDER_DESCRIPTORS },
});
