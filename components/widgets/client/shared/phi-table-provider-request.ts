import { isPhiRecord } from "../../../../helpers/is-record";
import type { PhiTableQuery } from "../../../../types/table-widget";

/*
 * What every Table Provider does on its way to its route, written once.
 *
 * Six Providers carried these word for word: how a filter is read, how an answer's rows are kept to the
 * records among them, how a positive integer arrives as a number or as the string a filter carries it
 * in, what a request to a Site route looks like, and how a page is named. One copy means one answer --
 * a Provider that reads a filter differently is making a different claim, and should have to say so.
 */

/** A string filter the Table sent, trimmed; anything else is no filter. */
export function readPhiTableStringFilter(query: PhiTableQuery, key: string) {
  const value = query.filters?.[key];
  return typeof value === "string" ? value.trim() : "";
}

/** The rows of an answer: every record in the array, nothing else. */
export function readPhiTableRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isPhiRecord) : [];
}

/** A positive integer, as a number or as the string a filter or row identity carries it in; else none. */
export function readPhiPositiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** The request a Table Provider sends a Site route: fresh, with the Site session, asking for JSON. */
export function createPhiTableProviderRequestInit(signal: AbortSignal | undefined): RequestInit {
  return {
    cache: "no-store",
    credentials: "include",
    headers: { accept: "application/json" },
    signal,
  };
}

/** `page` and `pageSize` as a route reads them, with the Table's defaults where the query names none. */
export function buildPhiTablePageParams(query: PhiTableQuery, defaultPageSize = 25) {
  return new URLSearchParams({
    page: String(query.page && query.page > 0 ? query.page : 1),
    pageSize: String(query.pageSize && query.pageSize > 0 ? query.pageSize : defaultPageSize),
  });
}
