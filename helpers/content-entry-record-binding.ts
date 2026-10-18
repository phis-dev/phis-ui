import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../constants/core-data-provider-keys";
import type { PhiContentEntryKind } from "../constants/content-entry-kinds";
import {
  readPhiRuntimeDataProviderBinding,
  type PhiRuntimeDataProviderBinding,
} from "../types/runtime-data-provider";

/**
 * A binding to one entry through the content entry record Provider (`types/record-provider.ts`): what a
 * detail route's tree writes into the Widgets it places, the route's slug in the parameters.
 */
export function createPhiContentEntryRecordBinding(kind: PhiContentEntryKind, slug: string): PhiRuntimeDataProviderBinding {
  return { providerKey: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry, params: { kind, slug } };
}

/**
 * The record an entry Widget is bound to. A stored binding is kept whichever record Provider it names;
 * a Widget that names none starts on the content entry Provider, with News and no address until somebody
 * picks them in the Inspector.
 */
export function readPhiContentEntryRecordBinding(value: unknown): PhiRuntimeDataProviderBinding {
  return readPhiRuntimeDataProviderBinding(value) ?? createPhiContentEntryRecordBinding("news", "");
}

/**
 * What a binding says about its entry, for the Builder's placeholder: the kind and address it names, or
 * nothing where it is bound to another Provider's record or names no address yet.
 */
export function describePhiContentEntryRecordBinding(binding: PhiRuntimeDataProviderBinding | null | undefined) {
  if (binding?.providerKey !== PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntry) {
    return { kind: null, slug: "" };
  }
  const { kind, slug } = binding.params ?? {};
  return {
    kind: typeof kind === "string" ? kind : null,
    slug: typeof slug === "string" ? slug.trim() : "",
  };
}
