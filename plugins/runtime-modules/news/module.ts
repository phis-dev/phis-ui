import type { PhiRuntimeModule } from "../contracts";
import { PHI_NEWS_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_NEWS_RUNTIME_MODULE = {
  ...PHI_NEWS_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
