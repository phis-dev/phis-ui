export type PhiRuntimeDataProviderKey = `${string}/${string}`;

export type PhiRuntimeDataProviderKind = "options" | "table" | "tree" | "collection";

export type PhiRuntimeDataProviderExecutionMode = "static" | "live";

export type PhiRuntimeDataProviderAuthoringMode = "none" | "read" | "edit";

export type PhiRuntimeDataProviderBinding = {
  providerKey: PhiRuntimeDataProviderKey;
  scopeKey?: string;
  params?: Record<string, unknown>;
};

/**
 * `<namespace>/<name>`: an identifier that says whose it is.
 *
 * Provider keys, item renderer keys and everything else a Module may contribute to a shared registry
 * share this shape, so they share one check. A second spelling of it is the one that drifts.
 */
export function isPhiNamespacedRuntimeKey(value: unknown): value is `${string}/${string}` {
  if (typeof value !== "string") {
    return false;
  }

  const separatorIndex = value.lastIndexOf("/");
  return separatorIndex > 0 && separatorIndex < value.length - 1;
}

export function isPhiRuntimeDataProviderKey(value: unknown): value is PhiRuntimeDataProviderKey {
  return isPhiNamespacedRuntimeKey(value);
}
