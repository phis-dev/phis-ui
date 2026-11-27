import type { PhiRuntimeModule } from "../contracts";
import { PHI_BILLING_RUNTIME_MODULE_DEFINITION } from "./definition";

export const PHI_BILLING_RUNTIME_MODULE = {
  ...PHI_BILLING_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
