import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiRuntimeModuleDefinition } from "../contracts";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_IDENTITY } from "./ids";
import { PHI_CORE_SERVER_BINDING } from "../../../types/server-capabilities";
import { PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "./data-providers";

export const PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION = {
  ...PHI_OBSERVABILITY_RUNTIME_MODULE_IDENTITY,
  kind: "module",
  eligibleAreas: ["admin"] as const satisfies readonly PhiCmsAreaKey[],
  serverBinding: PHI_CORE_SERVER_BINDING,
  title: "Observability",
  description: "Site-runtime log administration.",
  category: "foundation",
  iconFamily: "observability",
  dataProviders: PHI_OBSERVABILITY_RUNTIME_DATA_PROVIDER_DESCRIPTORS,
} satisfies PhiRuntimeModuleDefinition;
