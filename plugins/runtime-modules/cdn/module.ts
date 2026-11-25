import type { PhiRuntimeModule } from "../contracts";
import { PHI_CDN_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_CDN_RUNTIME_MODULE = {
  ...PHI_CDN_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
