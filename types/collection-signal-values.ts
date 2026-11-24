import { isPhiRecord } from "../helpers/is-record";
import type { PhiCollectionActionSignalValue, PhiCollectionProviderQuery } from "./collection-provider";

/*
 * What a Collection View says on its `actionActivate` output, read by whoever listens: a record-bound
 * Form, the Overlay container (which opens on an action) and Module Controllers. The Overlay container is
 * on every page, so the reader lives apart from the Collection Provider's contract and imports nothing
 * else, as the Table's readers do (`table-signal-values.ts`).
 */
export function readPhiCollectionActionSignalValue(value: unknown): PhiCollectionActionSignalValue | null {
  if (!isPhiRecord(value) || typeof value.actionKey !== "string" || !value.actionKey.trim()) {
    return null;
  }
  const itemKey = value.itemKey;
  if (itemKey !== undefined && itemKey !== null &&
    !(typeof itemKey === "string" && itemKey.trim()) &&
    !(typeof itemKey === "number" && Number.isFinite(itemKey))) {
    return null;
  }
  return {
    actionKey: value.actionKey.trim(),
    ...(itemKey == null ? {} : { itemKey: itemKey as string | number }),
    ...(isPhiRecord(value.query) ? { query: value.query as PhiCollectionProviderQuery } : {}),
  };
}
