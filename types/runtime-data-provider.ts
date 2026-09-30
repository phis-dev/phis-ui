/*
 * The key shape is part of stored descriptors -- a Form field names its options provider by it -- so it
 * is read from `@phis/contracts/controls` with the check that goes with it.
 */
export {
  isPhiNamespacedRuntimeKey,
  isPhiRuntimeDataProviderKey,
  type PhiRuntimeDataProviderKey,
} from "@phis/contracts/controls";
import { isPhiRuntimeDataProviderKey as isProviderKey, type PhiRuntimeDataProviderKey } from "@phis/contracts/controls";

export type PhiRuntimeDataProviderKind = "options" | "table" | "tree" | "collection";

export type PhiRuntimeDataProviderExecutionMode = "static" | "live";

export type PhiRuntimeDataProviderAuthoringMode = "none" | "read" | "edit";

export type PhiRuntimeDataProviderBinding = {
  providerKey: PhiRuntimeDataProviderKey;
  scopeKey?: string;
  params?: Record<string, unknown>;
};

/**
 * Where a Widget's rows or items come from: a Provider, the resource it serves, and what it is asked with.
 *
 * One shape for every Provider-backed Widget -- Table, Form, Collection View, Record -- because a Preset
 * writes the same three things into each, and three readers for one shape had drifted apart already.
 */
export type PhiProviderResourceSource = PhiRuntimeDataProviderBinding & {
  resourceKey: string;
};

/** Reads a stored source; anything without a namespaced Provider key and a resource is no source. */
export function readPhiProviderResourceSource(value: unknown): PhiProviderResourceSource | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const resourceKey = typeof record.resourceKey === "string" ? record.resourceKey.trim() : "";
  if (!isProviderKey(record.providerKey) || !resourceKey) {
    return null;
  }
  const scopeKey = typeof record.scopeKey === "string" && record.scopeKey.trim() ? record.scopeKey.trim() : undefined;
  const params = record.params && typeof record.params === "object" && !Array.isArray(record.params)
    ? record.params as Record<string, unknown>
    : undefined;
  return {
    providerKey: record.providerKey,
    resourceKey,
    ...(scopeKey ? { scopeKey } : {}),
    ...(params ? { params } : {}),
  };
}
