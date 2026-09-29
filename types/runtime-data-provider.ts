/*
 * The key shape is part of stored descriptors -- a Form field names its options provider by it -- so it
 * is read from `@phis/contracts/controls` with the check that goes with it.
 */
export {
  isPhiNamespacedRuntimeKey,
  isPhiRuntimeDataProviderKey,
  type PhiRuntimeDataProviderKey,
} from "@phis/contracts/controls";
import type { PhiRuntimeDataProviderKey } from "@phis/contracts/controls";

export type PhiRuntimeDataProviderKind = "options" | "table" | "tree" | "collection";

export type PhiRuntimeDataProviderExecutionMode = "static" | "live";

export type PhiRuntimeDataProviderAuthoringMode = "none" | "read" | "edit";

export type PhiRuntimeDataProviderBinding = {
  providerKey: PhiRuntimeDataProviderKey;
  scopeKey?: string;
  params?: Record<string, unknown>;
};
