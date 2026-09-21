import { createPhiModuleScopedKey } from "./runtime-module-ownership";
import type { PhiRuntimeDataProviderKey } from "../types/runtime-data-provider";

/**
 * A first-party item renderer key.
 *
 * Renderers live in the same Render Client manifest as Widgets, so their keys are namespaced the same
 * way and owned the same way: the registry that records who a name belongs to does not care what kind
 * of thing wears it.
 */
export function createPhiSharedRuntimeItemRendererKey(key: string) {
  return createPhiModuleScopedKey("renderers", key) as `${string}/${string}`;
}

export function createPhiSharedRuntimeDataProviderKey(
  kind: "options" | "tables" | "trees" | "collections",
  key: string,
) {
  return createPhiModuleScopedKey(kind, key) as PhiRuntimeDataProviderKey;
}
