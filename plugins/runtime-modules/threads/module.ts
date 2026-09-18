import type { PhiRuntimeModule } from "../contracts";
import { PHI_THREADS_RUNTIME_MODULE_DEFINITION } from "./definition";

/**
 * No Controller yet: the composer keeps its own draft and learns which conversation it is in from a
 * signal, so there is nothing for a Controller to coordinate. The inbox and the conversation will need
 * one; it belongs with them rather than ahead of them.
 */
export const PHI_THREADS_RUNTIME_MODULE = {
  ...PHI_THREADS_RUNTIME_MODULE_DEFINITION,
} satisfies PhiRuntimeModule;
