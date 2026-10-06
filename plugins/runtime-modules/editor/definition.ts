import { definePhiAreaBaseRuntimeModuleDefinition } from "../area-base-definition";
import { PHI_EDITOR_RUNTIME_MODULE_IDENTITY } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";

export const PHI_EDITOR_RUNTIME_MODULE_DEFINITION = definePhiAreaBaseRuntimeModuleDefinition({
  area: "editor",
  ...PHI_EDITOR_RUNTIME_MODULE_IDENTITY,
  serverBinding: PHI_CORE_SERVER_BINDING,
  description: "Locked Editor Area shell, content editor widgets, data, and workflows.",
  category: "foundation",
  iconFamily: "editor",
});
