"use client";

import { useMemo } from "react";

import type { PhiProviderResourceSource } from "../../types/runtime-data-provider";
import type { PhiTableProviderRecordRequest } from "../../types/table-widget";
import { usePhiTableProvider } from "../widgets/client/shared/phi-table-provider";
import { usePhiCollectionProvider } from "../widgets/client/shared/phi-collection-provider";
import { readPhiAnnouncedAction } from "../../helpers/announced-action";
import type { PhiSignalValueSchema } from "../../types/signals";

type RecordReader = (request: PhiTableProviderRecordRequest) => Promise<Record<string, unknown>>;

type ProviderLookup = {
  provider: { readRecord?: RecordReader } | null;
  resource: { recordRead?: boolean } | null;
  bindingError: string | null;
};

/**
 * Where a record-bound Form reads its record (`source`): a Table Provider's resource, or a Collection
 * Provider's, whichever of the two the Area mounted under the source's key -- a Provider key names one
 * kind, so at most one answers. Either reads through its Client's `readRecord`, in the one request shape
 * (`PhiTableProviderRecordRequest`), and only for a resource that declares `recordRead: true`.
 *
 * `read` is null where there is nothing to read with, and `error` then says why; both are null without a
 * source, which is a Form that starts from its placement's values.
 */
export function resolvePhiFormRecordSource(
  source: PhiProviderResourceSource | null,
  table: ProviderLookup,
  collection: ProviderLookup,
): { read: RecordReader | null; error: string | null } {
  if (!source) return { read: null, error: null };
  const lookup = table.provider ? table : collection.provider ? collection : null;
  if (!lookup) return { read: null, error: table.bindingError };
  if (lookup.bindingError) return { read: null, error: lookup.bindingError };
  const readRecord = lookup.provider?.readRecord;
  if (lookup.resource?.recordRead !== true || !readRecord) {
    return {
      read: null,
      error: `${lookup === table ? "Table" : "Collection"} resource "${source.resourceKey}" is not a Form record read source.`,
    };
  }
  return { read: readRecord, error: null };
}

export function usePhiFormRecordSource(source: PhiProviderResourceSource | null) {
  const { provider: tableProvider, resource: tableResource, bindingError: tableError } = usePhiTableProvider(source);
  const {
    provider: collectionProvider,
    resource: collectionResource,
    bindingError: collectionError,
  } = usePhiCollectionProvider(source);
  return useMemo(() => resolvePhiFormRecordSource(
    source,
    { provider: tableProvider, resource: tableResource, bindingError: tableError },
    { provider: collectionProvider, resource: collectionResource, bindingError: collectionError },
  ), [collectionError, collectionProvider, collectionResource, source, tableError, tableProvider, tableResource]);
}

/**
 * The record a `recordOpen` asks for, or null where it is not meant for this Form: a Table's row action
 * (`table-action`, its `rowIdentity`) or a Collection View's item action (`collection-action`, its
 * `itemKey`), named by the Form's `openActionKey` and carrying a record. Which of the two arrived is the
 * route's schema; anything else opens nothing.
 */
export function readPhiFormRecordOpenKey(
  valueSchema: PhiSignalValueSchema | null | undefined,
  value: unknown,
  openActionKey: string,
): string | number | null {
  const announced = readPhiAnnouncedAction(valueSchema, value);
  if (!announced || announced.actionKey !== openActionKey) return null;
  return announced.recordKey;
}
