"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import {
  readPhiPositiveInteger,
  readPhiTableRows,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  createPhiCollectionProviderClient,
  type PhiCollectionProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-collection-provider";
import type { PhiCollectionProviderData, PhiCollectionProviderQueryRequest } from "../../../../types/collection-provider";
import { toPhiSiteAddressRow } from "../../../../helpers/site-address-row";
import {
  PHI_CUSTOMER_FILE_MEMBER_PARAM,
  PHI_CUSTOMER_FILE_OWN_FILE_PARAM,
  PHI_CUSTOMER_FILE_RESOURCE_KEYS as RESOURCES,
} from "../../../../constants/customer-file";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  buildPhiCustomerFileFirstPagePath,
  PhiCustomerFileOwnFileRefusal,
  readPhiCustomerFile,
} from "./customer-file-read";

function answer(items: Record<string, unknown>[], emptyDescription?: string): PhiCollectionProviderData {
  return {
    resourceKey: RESOURCES.addresses,
    items,
    total: items.length,
    loading: false,
    error: null,
    ...(emptyDescription ? { meta: { emptyDescription } } : {}),
  };
}

/**
 * The chosen member's addresses, read-only, as tiles (`PHI_SITE_ADDRESS_ITEM_RENDERER_KEY`): from the first
 * page of their file, the request the person Table, the conversations Table and the Conversations Controller
 * make for the same choice -- joined, never asked again (`readPhiCustomerFile`), so one choice is still one
 * entry in the access log. The member is the binding param `userId` the Controller forwards.
 *
 * Nobody chosen reads nothing. The reader's own file, which Core refuses, answers no addresses with the
 * Page's own-file sentence as the tiles' empty sentence (`meta.emptyDescription`), as each Table says it
 * where its rows would be; any other failure is the source's.
 */
export async function queryPhiCustomerFileAddresses({ resourceKey, params, signal }: PhiCollectionProviderQueryRequest) {
  if (resourceKey !== RESOURCES.addresses) {
    throw new Error(`Unknown customer file addresses resource "${resourceKey}".`);
  }
  const userId = readPhiPositiveInteger(params?.[PHI_CUSTOMER_FILE_MEMBER_PARAM]);
  if (!userId) return answer([]);
  try {
    const result = await readPhiCustomerFile(buildPhiCustomerFileFirstPagePath(userId), signal);
    if (!isPhiRecord(result) || !isPhiRecord(result.person)) {
      throw new Error("The customer file answer is invalid.");
    }
    return answer(readPhiTableRows(result.person.addresses).map(toPhiSiteAddressRow));
  } catch (error) {
    if (!(error instanceof PhiCustomerFileOwnFileRefusal)) throw error;
    const notice = params?.[PHI_CUSTOMER_FILE_OWN_FILE_PARAM];
    return answer([], typeof notice === "string" && notice.trim() ? notice : error.message);
  }
}

const descriptor = PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((candidate) => candidate.key === PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFileAddresses);
const resources = descriptor?.kind === "collection" ? descriptor.resources : [];

export const PHI_THREADS_CUSTOMER_FILE_ADDRESSES_PROVIDER_REGISTRATION = {
  key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFileAddresses,
  resources,
  query: queryPhiCustomerFileAddresses,
} satisfies PhiCollectionProviderRegistration;

export const PhiThreadsCustomerFileAddressesProviderClient = createPhiCollectionProviderClient(
  PHI_THREADS_CUSTOMER_FILE_ADDRESSES_PROVIDER_REGISTRATION,
);
