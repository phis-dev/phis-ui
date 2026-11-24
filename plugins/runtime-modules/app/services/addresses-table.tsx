"use client";

import { PhisSiteAddressFlags } from "@phis/contracts/users";
import { isPhiRecord } from "../../../../helpers/is-record";
import {
  createPhiTableProviderRequestInit,
  readPhiPositiveInteger,
  readPhiTableRows,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import {
  createPhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import {
  PhiTableProviderError,
  type PhiTableProviderMutationRequest,
  type PhiTableProviderQueryRequest,
  type PhiTableProviderRecordRequest,
} from "../../../../types/table-widget";
import { PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_APP_ADDRESSES_DATA_PROVIDER_KEY, PHI_APP_ADDRESSES_RESOURCE_KEY } from "../ids";
import { PHI_SITE_ADDRESS_TEXT_KEYS, toPhiSiteAddressRow } from "../../../../helpers/site-address-row";

/** The account's own address book (phis-server `/api/site/account/addresses`). */
export const PHI_APP_ADDRESSES_PATH = "/api/site/account/addresses";
const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Addresses" };

/*
 * The addresses as the last list answered them, which a default is set from: Core takes an address equal in
 * every part to a current one as that one, given the purposes and defaults asked besides, so setting a
 * default sends the address again rather than writing a new version of it.
 */
const listed = new Map<number, Record<string, unknown>>();

function requireResource(resourceKey: string) {
  if (resourceKey !== PHI_APP_ADDRESSES_RESOURCE_KEY) {
    throw new PhiTableProviderError("resource-not-found", `Unknown addresses resource "${resourceKey}".`);
  }
}

async function readAddresses(signal: AbortSignal | undefined) {
  const result = await readPhiTableProviderResponse<{ items?: unknown }>(
    await fetch(PHI_APP_ADDRESSES_PATH, createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );
  const items = readPhiTableRows(result?.items);
  listed.clear();
  for (const item of items) {
    const id = readPhiPositiveInteger(item.id);
    if (id) listed.set(id, item);
  }
  return items;
}

async function queryAddresses({ resourceKey, signal }: PhiTableProviderQueryRequest) {
  requireResource(resourceKey);
  const rows = (await readAddresses(signal)).map(toPhiSiteAddressRow);
  return { rows, total: rows.length };
}

async function readAddressRecord({ resourceKey, rowIdentity, signal }: PhiTableProviderRecordRequest) {
  requireResource(resourceKey);
  const id = readPhiPositiveInteger(rowIdentity);
  const address = (await readAddresses(signal)).find((item) => item.id === id);
  if (!id || !address) {
    throw new PhiTableProviderError("record-not-found", "This address is no longer one of yours.");
  }
  return toPhiSiteAddressRow(address);
}

/** The request that gives a listed address the default it asks for, or throws where it has none listed. */
export function buildPhiAppAddressDefaultRequest(address: Record<string, unknown>, actionKey: "makeDefaultBilling" | "makeDefaultShipping") {
  const flags = typeof address.flags === "number" ? address.flags : 0;
  const added = actionKey === "makeDefaultBilling"
    ? PhisSiteAddressFlags.Billing | PhisSiteAddressFlags.DefaultBilling
    : PhisSiteAddressFlags.Shipping | PhisSiteAddressFlags.DefaultShipping;
  const writable = PhisSiteAddressFlags.Billing | PhisSiteAddressFlags.Shipping |
    PhisSiteAddressFlags.DefaultBilling | PhisSiteAddressFlags.DefaultShipping;
  return {
    address: Object.fromEntries(PHI_SITE_ADDRESS_TEXT_KEYS.map((key) => [key, address[key] ?? null])),
    flags: (flags & writable) | added,
  };
}

async function mutateAddresses(request: PhiTableProviderMutationRequest) {
  requireResource(request.resourceKey);
  if (request.kind !== "action") {
    throw new PhiTableProviderError("mutation-not-supported", "Addresses are changed through their dialog, never in a cell.");
  }
  const id = readPhiPositiveInteger(request.rowIdentity);
  if (!id) throw new PhiTableProviderError("invalid-query", "An address id is required.");
  const init = createPhiTableProviderRequestInit(request.signal);
  if (request.actionKey === "delete") {
    await readPhiTableProviderResponse<unknown>(
      await fetch(`${PHI_APP_ADDRESSES_PATH}/${id}`, { ...init, method: "DELETE" }),
      RESPONSE_OPTIONS,
    );
  } else if (request.actionKey === "makeDefaultBilling" || request.actionKey === "makeDefaultShipping") {
    const address = listed.get(id);
    if (!isPhiRecord(address)) throw new PhiTableProviderError("record-not-found", "This address is no longer listed.");
    await readPhiTableProviderResponse<unknown>(
      await fetch(PHI_APP_ADDRESSES_PATH, {
        ...init,
        method: "POST",
        headers: { ...init.headers, "content-type": "application/json" },
        body: JSON.stringify(buildPhiAppAddressDefaultRequest(address, request.actionKey)),
      }),
      RESPONSE_OPTIONS,
    );
  } else {
    throw new PhiTableProviderError("action-not-supported", `Unsupported addresses action "${request.actionKey}".`);
  }
  // A default moves from the address that held it, and a removal takes a row: the view is read again.
  return { status: "accepted" as const, invalidation: "view" as const };
}

const resources = PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_APP_ADDRESSES_DATA_PROVIDER_KEY)?.resources ?? [];

export const PHI_APP_ADDRESSES_TABLE_PROVIDER_REGISTRATION = {
  key: PHI_APP_ADDRESSES_DATA_PROVIDER_KEY,
  resources,
  query: queryAddresses,
  readRecord: readAddressRecord,
  mutate: mutateAddresses,
} satisfies PhiTableProviderRegistration;

export const PhiAppAddressesTableProviderClient = createPhiTableProviderClient(PHI_APP_ADDRESSES_TABLE_PROVIDER_REGISTRATION);
