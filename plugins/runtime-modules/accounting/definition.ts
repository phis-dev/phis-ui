import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_ACCOUNTING_RUNTIME_MODULE_IDENTITY } from "./ids";
import { PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";
import {
  PHI_CORE_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "accounting",
  ...PHI_ACCOUNTING_RUNTIME_MODULE_IDENTITY,
  serverBinding: PHI_CORE_SERVER_BINDING,
  description: "Locked Accounting Area shell, navigation surface, root route, and the Site's product directory.",
  category: "foundation",
  dataProviders: PHI_ACCOUNTING_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
});
