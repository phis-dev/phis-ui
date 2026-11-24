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
  createPhiCollectionProviderClient,
  type PhiCollectionProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-collection-provider";
import type {
  PhiCollectionProviderActionRequest,
  PhiCollectionProviderData,
  PhiCollectionProviderQueryRequest,
  PhiCollectionProviderRecordRequest,
} from "../../../../types/collection-provider";
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
    throw new Error(`Unknown addresses resource "${resourceKey}".`);
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

async function listAddresses(signal: AbortSignal | undefined): Promise<PhiCollectionProviderData> {
  const items = (await readAddresses(signal)).map(toPhiSiteAddressRow);
  return { resourceKey: PHI_APP_ADDRESSES_RESOURCE_KEY, items, total: items.length, loading: false, error: null };
}

async function queryAddresses({ resourceKey, signal }: PhiCollectionProviderQueryRequest) {
  requireResource(resourceKey);
  return listAddresses(signal);
}

/** One address for the change Form, opened from its tile: read from the list, as Core has no single read. */
async function readAddressRecord({ resourceKey, rowIdentity, signal }: PhiCollectionProviderRecordRequest) {
  requireResource(resourceKey);
  const id = readPhiPositiveInteger(rowIdentity);
  const address = (await readAddresses(signal)).find((item) => item.id === id);
  if (!id || !address) {
    throw new Error("This address is no longer one of yours.");
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

/*
 * A removal and the two defaults, each answered by the list as it now stands: a default moves from the
 * address that held it, and a removal takes a tile. `create` and `edit` are announced by the tiles and
 * open the Module's two Forms; they never reach here.
 */
async function actOnAddress(request: PhiCollectionProviderActionRequest): Promise<PhiCollectionProviderData> {
  requireResource(request.resourceKey);
  const id = readPhiPositiveInteger(request.itemKey);
  if (!id) throw new Error("An address id is required.");
  const init = createPhiTableProviderRequestInit(request.signal);
  if (request.actionKey === "delete") {
    await readPhiTableProviderResponse<unknown>(
      await fetch(`${PHI_APP_ADDRESSES_PATH}/${id}`, { ...init, method: "DELETE" }),
      RESPONSE_OPTIONS,
    );
  } else if (request.actionKey === "makeDefaultBilling" || request.actionKey === "makeDefaultShipping") {
    const address = listed.get(id);
    if (!isPhiRecord(address)) throw new Error("This address is no longer listed.");
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
    throw new Error(`Unsupported addresses action "${request.actionKey}".`);
  }
  return listAddresses(request.signal);
}

const resources = PHI_APP_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_APP_ADDRESSES_DATA_PROVIDER_KEY)?.resources ?? [];

export const PHI_APP_ADDRESSES_COLLECTION_PROVIDER_REGISTRATION = {
  key: PHI_APP_ADDRESSES_DATA_PROVIDER_KEY,
  resources,
  query: queryAddresses,
  readRecord: readAddressRecord,
  action: actOnAddress,
} satisfies PhiCollectionProviderRegistration;

export const PhiAppAddressesCollectionProviderClient = createPhiCollectionProviderClient(
  PHI_APP_ADDRESSES_COLLECTION_PROVIDER_REGISTRATION,
);
