import type { PhiRuntimeModule } from "../contracts";
import { PHI_SEARCH_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_SEARCH_RUNTIME_MODULE = {
  ...PHI_SEARCH_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
