"use client";

import { isPhiRecord } from "../../../../helpers/is-record";
import { readPhiJsonError, readPhiJsonPayload } from "../../../../helpers/client-json-request";
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
import {
  PHI_CUSTOMER_FILE_OWN_FILE_PARAM,
  PHI_CUSTOMER_FILE_RESOURCE_KEYS as RESOURCES,
  PHI_CUSTOMER_FILE_SUBJECT_PARAM,
} from "../../../../constants/customer-file";
import { PHI_TABLE_PROVIDER_REFUSED_CODE } from "../../../../components/widgets/client/shared/phi-table-provider-refusal";
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

/*
 * Core's refusal of the reader's own file (`403`): the route answers that and nothing else to someone who
 * may open files at all, and nobody else reaches this Page or its member picker.
 */
class PhiCustomerFileOwnFileRefusal extends Error {}

type CustomerFileRead = {
  promise: Promise<Record<string, unknown> | null>;
  controller: AbortController;
  waiters: number;
};

/*
 * The reads of one route in flight, by its path. The Page's three Tables ask for the same member at the
 * same time -- the person Table's choice reaches the other two as their query -- and one request answers
 * them all, so one choice is one entry in the access log. Nothing outlives the request: once it settles
 * its entry is gone, and the next read, a reload or another member asks again.
 */
const customerFileReads = new Map<string, CustomerFileRead>();

function abortReason(signal: AbortSignal) {
  return signal.reason ?? new DOMException("The read was aborted.", "AbortError");
}

/**
 * The route's answer for this caller. A caller that aborts leaves the request to the others; the request
 * itself is aborted only when the last of them has gone, and is then no longer joined.
 */
function readCustomerFile(path: string, signal: AbortSignal | undefined) {
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  let read = customerFileReads.get(path);
  if (!read) {
    const controller = new AbortController();
    const entry: CustomerFileRead = {
      controller,
      waiters: 0,
      promise: (async () => {
        const response = await fetch(path, createPhiTableProviderRequestInit(controller.signal));
        if (response.status === 403) {
          const refused = await readPhiJsonPayload<unknown>(response);
          throw new PhiCustomerFileOwnFileRefusal(readPhiJsonError(refused, "Nobody reaches their own file."));
        }
        return readPhiTableProviderResponse<Record<string, unknown>>(response, RESPONSE_OPTIONS);
      })().finally(() => {
        if (customerFileReads.get(path) === entry) customerFileReads.delete(path);
      }),
    };
    // A request every caller left rejects with nobody listening.
    entry.promise.catch(() => undefined);
    customerFileReads.set(path, entry);
    read = entry;
  }
  const shared = read;
  shared.waiters += 1;
  if (!signal) return shared.promise;
  return new Promise<Record<string, unknown> | null>((resolve, reject) => {
    const leave = () => {
      shared.waiters -= 1;
      reject(abortReason(signal));
      if (shared.waiters > 0) return;
      if (customerFileReads.get(path) === shared) customerFileReads.delete(path);
      shared.controller.abort(abortReason(signal));
    };
    signal.addEventListener("abort", leave, { once: true });
    shared.promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", leave));
  });
}

async function queryCustomerFile({ resourceKey, query, params, signal }: PhiTableProviderQueryRequest) {
  if (!Object.values(RESOURCES).includes(resourceKey as never)) {
    throw new PhiTableProviderError("resource-not-found", `Unknown customer file resource "${resourceKey}".`);
  }
  // Nobody chosen yet: nothing is asked for, so nothing is written to the access log.
  const userId = readPhiPositiveInteger(query.filters?.userId);
  if (!userId) return resourceKey === RESOURCES.threads ? { rows: [] } : { rows: [], total: 0 };
  // The person and their addresses are the same on every page; they ask for the first, as the threads
  // Table does on a choice, so the three reads are one route.
  const paged = buildPhiTablePageParams(resourceKey === RESOURCES.threads ? query : {}, THREADS_PAGE_SIZE);
  const result = await readCustomerFile(buildPhiCustomerFilePath(userId, paged), signal).catch((error: unknown) => {
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
    return { rows: [toPhiCustomerFilePersonRow(result.person)], total: 1 };
  }
  if (resourceKey === RESOURCES.addresses) {
    const rows = readPhiTableRows(result.person.addresses).map(toPhiSiteAddressRow);
    return { rows, total: rows.length };
  }
  const page = Number(paged.get("page")) || 1;
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
