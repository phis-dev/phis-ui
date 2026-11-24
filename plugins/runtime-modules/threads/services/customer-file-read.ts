"use client";

import { readPhiJsonError, readPhiJsonPayload } from "../../../../helpers/client-json-request";
import {
  buildPhiTablePageParams,
  createPhiTableProviderRequestInit,
  readPhiPositiveInteger,
} from "../../../../components/widgets/client/shared/phi-table-provider-request";
import {
  readPhiTableProviderResponse,
  type ReadPhiTableProviderResponseOptions,
} from "../../../../components/widgets/client/shared/phi-table-provider-response";
import { isPhiRecord } from "../../../../helpers/is-record";

const RESPONSE_OPTIONS: ReadPhiTableProviderResponseOptions = { subject: "Customer file" };

/** The page size the customer file is read at; the Page's conversations Table names the same, Core takes up to 100. */
export const PHI_CUSTOMER_FILE_THREADS_PAGE_SIZE = 25;

/** The member's file, a page of the conversations they take part in included. */
export function buildPhiCustomerFilePath(userId: number, page: URLSearchParams | null) {
  const path = `/api/site/members/${userId}/file`;
  return page ? `${path}?${page}` : path;
}

/**
 * The first page, as every reader of one choice asks for it: the person, their addresses, the file panel
 * and the conversations Table on a new choice all name this path, so they share one request.
 */
function buildPhiCustomerFileFirstPagePath(userId: number) {
  return buildPhiCustomerFilePath(userId, buildPhiTablePageParams({}, PHI_CUSTOMER_FILE_THREADS_PAGE_SIZE));
}

/*
 * Core's refusal of the reader's own file (`403`): the route answers that and nothing else to someone who
 * may open files at all, and nobody else reaches this Page or its member picker.
 */
export class PhiCustomerFileOwnFileRefusal extends Error {}

type CustomerFileRead = {
  promise: Promise<Record<string, unknown> | null>;
  controller: AbortController;
  waiters: number;
};

/*
 * The reads of one route in flight, by its path. The Page's Tables and the Conversations Controller, which
 * opens the file, ask for the same member at the same time -- the person Table's choice reaches all of them
 * at once -- and one request answers them all, so one choice is one entry in the access log. Nothing
 * outlives the request: once it settles its entry is gone, and the next read, a reload or another member
 * asks again.
 */
const customerFileReads = new Map<string, CustomerFileRead>();

function abortReason(signal: AbortSignal) {
  return signal.reason ?? new DOMException("The read was aborted.", "AbortError");
}

/**
 * The route's answer for this caller. A caller that aborts leaves the request to the others; the request
 * itself is aborted only when the last of them has gone, and is then no longer joined.
 */
export function readPhiCustomerFile(path: string, signal: AbortSignal | undefined) {
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

/**
 * The id of the member's file, from the same first-page read the Page's Tables make for the choice, or
 * null where there is none to show: Core refused the reader's own file, or answered no file. Anything
 * else that goes wrong is thrown, as the Tables are told.
 */
export async function readPhiCustomerFileThreadId(userId: number, signal: AbortSignal | undefined) {
  try {
    const result = await readPhiCustomerFile(buildPhiCustomerFileFirstPagePath(userId), signal);
    return isPhiRecord(result) ? readPhiPositiveInteger(result.fileThreadId) ?? null : null;
  } catch (error) {
    if (error instanceof PhiCustomerFileOwnFileRefusal) return null;
    throw error;
  }
}
