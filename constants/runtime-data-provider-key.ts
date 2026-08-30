import { createPhiModuleScopedKey } from "./runtime-module-ownership";
import type { PhiRuntimeDataProviderKey } from "../types/runtime-data-provider";

export function createPhiSharedRuntimeDataProviderKey(
  kind: "options" | "tables" | "trees" | "collections",
  key: string,
) {
  return createPhiModuleScopedKey(kind, key) as PhiRuntimeDataProviderKey;
}
