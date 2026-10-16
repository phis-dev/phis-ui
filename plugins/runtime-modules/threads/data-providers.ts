import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS,
  PHI_THREADS_RUNTIME_MODULE_ID,
} from "./ids";

/** Who this viewer may write to, for this Module's own Form that opens a conversation. */
export const PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.candidates,
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    kind: "options",
    executionMode: "live",
    authoringMode: "none",
    title: "People you can write to",
    description: "Whoever shares a group with this viewer, for naming them in a new conversation.",
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
