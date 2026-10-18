"use client";

import { useCallback, useMemo, useRef, type ReactNode } from "react";
import {
  createPhiTableProviderRequestInit,
  readPhiTableRows,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
} from "../../../../types/table-widget";
import {
  PhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS } from "../../../../constants/core-data-provider-keys";
import {
  isPhiContentEntryKind,
  resolvePhiContentEntryEditorApiPaths,
} from "../../../../constants/content-entry-kinds";
import { PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";

const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Categories" };

/** The kind a request names, which is its resource key; one this release does not know is refused. */
function readResourceKind(resourceKey: string) {
  if (!isPhiContentEntryKind(resourceKey)) {
    throw new PhiTableProviderError("resource-not-found", `Unknown content entry kind "${resourceKey}".`);
  }
  return resourceKey;
}

/**
 * Every content kind's categories for a Table, one resource per kind (phis-server CONTENT.md, Terms).
 *
 * A category is written in a Form -- a name, an address, a place -- so the only thing done to one here is
 * removing it, which files its entries under none. The whole list is one page: a Site keeps a handful.
 */
export function PhiContentEntryCategoriesTableProviderClient({ children }: { children: ReactNode }) {
  const recordsRef = useRef(new Map<string, Record<string, unknown>>());

  const query = useCallback(async ({ resourceKey, signal }: PhiTableProviderQueryRequest) => {
    const kind = readResourceKind(resourceKey);
    const result = await readPhiTableProviderResponse<{ categories?: unknown }>(
      await fetch(resolvePhiContentEntryEditorApiPaths(kind).categories, createPhiTableProviderRequestInit(signal)),
      RESPONSE_OPTIONS,
    );
    const rows = readPhiTableRows(result?.categories);
    for (const row of rows) {
      recordsRef.current.set(`${kind}:${String(row.id)}`, row);
    }
    return { rows, total: rows.length, page: 1, pageSize: rows.length || 1 };
  }, []);

  const readRecord = useCallback(async ({
    resourceKey,
    rowIdentity,
  }: {
    resourceKey: string;
    rowIdentity: string | number | null;
    signal: AbortSignal;
  }) => {
    const record = rowIdentity == null
      ? null
      : recordsRef.current.get(`${readResourceKind(resourceKey)}:${String(rowIdentity)}`);
    if (!record) {
      throw new PhiTableProviderError(
        "record-not-loaded",
        "That category is no longer in the current Table view. Reload the Table and try again.",
      );
    }
    return record;
  }, []);

  const mutate = useCallback(async (request: PhiTableProviderMutationRequest) => {
    if (request.kind !== "action") {
      throw new PhiTableProviderError("mutation-not-supported", "Categories are edited through the Form.");
    }
    const kind = readResourceKind(request.resourceKey);
    if (request.actionKey === "refresh") {
      return { status: "accepted" as const, invalidation: "view" as const };
    }
    if (request.actionKey !== "delete") {
      throw new PhiTableProviderError("action-not-supported", `Unsupported category action "${request.actionKey}".`);
    }
    const id = Number(request.rowIdentity);
    if (!Number.isInteger(id) || id <= 0) {
      throw new PhiTableProviderError("invalid-row-identity", "That action needs a category.");
    }
    await readPhiTableProviderResponse<unknown>(
      await fetch(`${resolvePhiContentEntryEditorApiPaths(kind).categories}?id=${id}`, {
        method: "DELETE",
        cache: "no-store",
        credentials: "include",
        headers: { accept: "application/json" },
        signal: request.signal,
      }),
      RESPONSE_OPTIONS,
    );
    return { status: "accepted" as const, invalidation: "resource" as const };
  }, []);

  const registration = useMemo<PhiTableProviderRegistration>(() => ({
    key: PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryCategories,
    resources: PHI_CORE_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find(
      (descriptor) => descriptor.key === PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS.contentEntryCategories,
    )?.resources ?? [],
    query,
    readRecord,
    mutate,
  }), [mutate, query, readRecord]);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
