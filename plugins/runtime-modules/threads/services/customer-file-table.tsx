"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import {
  buildPhiTablePageParams,
  readPhiPositiveInteger,
  readPhiTableRows,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  createPhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import { PhiTableProviderError, type PhiTableProviderQueryRequest } from "../../../../types/table-widget";
import { readPhiThreadInboxRow } from "../../../../helpers/thread-inbox-row";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import {
  PHI_CUSTOMER_FILE_OWN_FILE_PARAM,
  PHI_CUSTOMER_FILE_RESOURCE_KEYS as RESOURCES,
} from "../../../../constants/customer-file";
import { PHI_TABLE_PROVIDER_REFUSED_CODE } from "../../../../components/widgets/client/shared/phi-table-provider-refusal";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  buildPhiCustomerFilePath,
  PHI_CUSTOMER_FILE_THREADS_PAGE_SIZE,
  PhiCustomerFileOwnFileRefusal,
  readPhiCustomerFile,
} from "./customer-file-read";

export { buildPhiCustomerFilePath } from "./customer-file-read";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** The person as Core answered them, one row; a field the actor may not read stays empty. */
export function toPhiCustomerFilePersonRow(person: Record<string, unknown>) {
  const name = isPhiRecord(person.name) ? person.name : null;
  const phone = isPhiRecord(person.phone) ? person.phone : null;
  return {
    userId: person.userId,
    displayName: text(person.displayName),
    fullName: name ? [text(name.firstName), text(name.lastName)].filter(Boolean).join(" ") : "",
    companyName: name ? text(name.companyName) : "",
    email: text(person.email),
    phone: phone ? text(phone.phone) : "",
    mobile: phone ? text(phone.mobile) : "",
  };
}

/**
 * The person's conversations as the listing shows them, read as the inbox reads its rows. Their file is
 * not one of them: Core answers its id beside the list, and the Page reads the file in a panel of its own
 * (THREADS.md, section 10), so a row of it that the list carries is left out.
 */
export function toPhiCustomerFileThreadRows(result: Record<string, unknown>) {
  const fileThreadId = readPhiPositiveInteger(result.fileThreadId);
  return readPhiTableRows(result.threads)
    .map(readPhiThreadInboxRow)
    .filter((row) => (row as Record<string, unknown>).id !== fileThreadId);
}

async function queryCustomerFile({ resourceKey, query, params, signal }: PhiTableProviderQueryRequest) {
  if (resourceKey !== RESOURCES.person && resourceKey !== RESOURCES.threads) {
    throw new PhiTableProviderError("resource-not-found", `Unknown customer file resource "${resourceKey}".`);
  }
  // Nobody chosen yet: nothing is asked for, so nothing is written to the access log.
  const userId = readPhiPositiveInteger(query.filters?.userId);
  if (!userId) {
    if (resourceKey === RESOURCES.threads) return { rows: [] };
    return { rows: [], total: 0, summary: { userId: null } };
  }
  // The person is the same on every page; it asks for the first, as the conversations Table, the
  // addresses Collection and the Controller opening the file do on a choice, so the reads are one route.
  const paged = buildPhiTablePageParams(resourceKey === RESOURCES.threads ? query : {}, PHI_CUSTOMER_FILE_THREADS_PAGE_SIZE);
  const result = await readPhiCustomerFile(buildPhiCustomerFilePath(userId, paged), signal).catch((error: unknown) => {
    if (!(error instanceof PhiCustomerFileOwnFileRefusal)) throw error;
    // Said where the rows would be, in the Page's words where it gave them, and the picker stays.
    const notice = params?.[PHI_CUSTOMER_FILE_OWN_FILE_PARAM];
    throw new PhiTableProviderError(
      PHI_TABLE_PROVIDER_REFUSED_CODE,
      typeof notice === "string" && notice.trim() ? notice : error.message,
    );
  });
  if (!isPhiRecord(result) || !isPhiRecord(result.person)) {
    throw new PhiTableProviderError("invalid-response", "The customer file answer is invalid.");
  }
  if (resourceKey === RESOURCES.person) {
    const row = toPhiCustomerFilePersonRow(result.person);
    return { rows: [row], total: 1, summary: { userId: typeof row.userId === "number" ? row.userId : null } };
  }
  return { rows: toPhiCustomerFileThreadRows(result) };
}

const descriptor = PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((candidate) => candidate.key === PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFile);
const resources = descriptor?.kind === "table" ? descriptor.resources : [];

export const PHI_THREADS_CUSTOMER_FILE_TABLE_PROVIDER_REGISTRATION = {
  key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFile,
  resources,
  query: queryCustomerFile,
} satisfies PhiTableProviderRegistration;

export const PhiThreadsCustomerFileTableProviderClient = createPhiTableProviderClient(
  PHI_THREADS_CUSTOMER_FILE_TABLE_PROVIDER_REGISTRATION,
);
