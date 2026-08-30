export type PhiRuntimeDataProviderKey = `${string}/${string}`;

export type PhiRuntimeDataProviderKind = "options" | "table" | "tree" | "collection";

export type PhiRuntimeDataProviderExecutionMode = "static" | "live";

export type PhiRuntimeDataProviderAuthoringMode = "none" | "read" | "edit";

export type PhiRuntimeDataProviderBinding = {
  providerKey: PhiRuntimeDataProviderKey;
  scopeKey?: string;
  params?: Record<string, unknown>;
};

export function isPhiRuntimeDataProviderKey(value: unknown): value is PhiRuntimeDataProviderKey {
  if (typeof value !== "string") {
    return false;
  }

  const separatorIndex = value.lastIndexOf("/");
  return separatorIndex > 0 && separatorIndex < value.length - 1;
}
