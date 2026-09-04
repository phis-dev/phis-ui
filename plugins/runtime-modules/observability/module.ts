import type { PhiRuntimeModule } from "../contracts";
import { PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_OBSERVABILITY_RUNTIME_MODULE = {
  ...PHI_OBSERVABILITY_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
