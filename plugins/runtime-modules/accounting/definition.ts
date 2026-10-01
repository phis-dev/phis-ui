import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "./ids";
import {
  PHI_CORE_SERVER_BINDING,
} from "../../../types/server-capabilities";

export const PHI_ACCOUNTING_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "accounting",
  moduleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  serverBinding: PHI_CORE_SERVER_BINDING,
  description: "Locked Accounting Area shell, navigation surface, and accounting workspace route.",
  category: "foundation",
  icon: "antd:profile",
});
