"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import {
  buildPhiTablePageParams,
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
import { PhiTableProviderError, type PhiTableProviderQueryRequest } from "../../../../types/table-widget";
import { PhisThreadKind, PhisThreadStatus } from "../../../../constants/threads";
import { toPhiSiteAddressRow } from "../../../../helpers/site-address-row";
import { readPhiThreadInboxRow } from "../../../../helpers/thread-inbox-row";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../data-providers";
import { PHI_CUSTOMER_FILE_RESOURCE_KEYS as RESOURCES, PHI_CUSTOMER_FILE_SUBJECT_PARAM } from "../../../../constants/customer-file";
import { PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";

const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Customer file" };
// The Page names the same size; Core takes up to 100.
const THREADS_PAGE_SIZE = 25;

/** The member's file, a page of the threads they take part in included. */
export function buildPhiCustomerFilePath(userId: number, page: URLSearchParams | null) {
  const path = `/api/site/members/${userId}/file`;
  return page ? `${path}?${page}` : path;
}

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
 * The threads as the listing shows them: the person's file first, on the first page only -- Core answers
 * its id beside the list, not in it -- then the conversations the actor sees that the person is in, as the
 * inbox reads its rows.
 */
export function toPhiCustomerFileThreadRows(result: Record<string, unknown>, page: number, fileSubject: string) {
  const fileThreadId = readPhiPositiveInteger(result.fileThreadId);
  const threads = readPhiTableRows(result.threads).map(readPhiThreadInboxRow);
  if (page !== 1 || !fileThreadId) return threads;
  return [{
    id: fileThreadId,
    subject: fileSubject,
    kind: String(PhisThreadKind.File),
    status: String(PhisThreadStatus.Open),
    archived: false,
    locked: false,
    state: "open",
    latestMessageAt: null,
  }, ...threads.filter((row) => (row as Record<string, unknown>).id !== fileThreadId)];
}

async function queryCustomerFile({ resourceKey, query, params, signal }: PhiTableProviderQueryRequest) {
  if (!Object.values(RESOURCES).includes(resourceKey as never)) {
    throw new PhiTableProviderError("resource-not-found", `Unknown customer file resource "${resourceKey}".`);
  }
  // Nobody chosen yet: nothing is asked for, so nothing is written to the access log.
  const userId = readPhiPositiveInteger(query.filters?.userId);
  if (!userId) return resourceKey === RESOURCES.threads ? { rows: [] } : { rows: [], total: 0 };
  const paged = resourceKey === RESOURCES.threads ? buildPhiTablePageParams(query, THREADS_PAGE_SIZE) : null;
  const result = await readPhiTableProviderResponse<Record<string, unknown>>(
    await fetch(buildPhiCustomerFilePath(userId, paged), createPhiTableProviderRequestInit(signal)),
    RESPONSE_OPTIONS,
  );
  if (!isPhiRecord(result) || !isPhiRecord(result.person)) {
    throw new PhiTableProviderError("invalid-response", "The customer file answer is invalid.");
  }
  if (resourceKey === RESOURCES.person) {
    return { rows: [toPhiCustomerFilePersonRow(result.person)], total: 1 };
  }
  if (resourceKey === RESOURCES.addresses) {
    const rows = readPhiTableRows(result.person.addresses).map(toPhiSiteAddressRow);
    return { rows, total: rows.length };
  }
  const page = Number(paged?.get("page")) || 1;
  const subject = typeof params?.[PHI_CUSTOMER_FILE_SUBJECT_PARAM] === "string" ? params[PHI_CUSTOMER_FILE_SUBJECT_PARAM] as string : "";
  return { rows: toPhiCustomerFileThreadRows(result, page, subject) };
}

const resources = PHI_THREADS_RUNTIME_DATA_PROVIDER_DESCRIPTORS
  .find((descriptor) => descriptor.key === PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFile)?.resources ?? [];

export const PHI_THREADS_CUSTOMER_FILE_TABLE_PROVIDER_REGISTRATION = {
  key: PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.customerFile,
  resources,
  query: queryCustomerFile,
} satisfies PhiTableProviderRegistration;

export const PhiThreadsCustomerFileTableProviderClient = createPhiTableProviderClient(
  PHI_THREADS_CUSTOMER_FILE_TABLE_PROVIDER_REGISTRATION,
);
