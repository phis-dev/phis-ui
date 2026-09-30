import { describe, expect, it } from "vitest";

import type { PhiTableProviderQueryRequest } from "../../../../types/table-widget";
import { queryPhiStaticTableResource, type PhiStaticTableResource } from "./phi-static-table-provider";

const resource = (rows: Record<string, unknown>[]) => ({
  descriptor: { resourceKey: "items", rowIdentityPath: "id" },
  rows,
}) as unknown as PhiStaticTableResource;

const request = (query: PhiTableProviderQueryRequest["query"]) => ({
  resourceKey: "items",
  query,
  signal: new AbortController().signal,
}) as PhiTableProviderQueryRequest;

const ids = (result: { rows: readonly Record<string, unknown>[] }) => result.rows.map((row) => row.id);

describe("a static Table resource's sort", () => {
  const rows = [
    { id: "a", rank: 10 },
    { id: "b", rank: "9" },
    { id: "c", rank: null },
    { id: "d", rank: 2 },
    { id: "e" },
  ];

  it("orders numbers and numeric text the same way, empty cells last", () => {
    const result = queryPhiStaticTableResource(
      resource(rows),
      request({ sorts: [{ key: "rank", direction: "ascending" }] }),
    );
    expect(ids(result)).toEqual(["d", "b", "a", "c", "e"]);
  });

  it("keeps empty cells last when descending", () => {
    const result = queryPhiStaticTableResource(
      resource(rows),
      request({ sorts: [{ key: "rank", direction: "descending" }] }),
    );
    expect(ids(result)).toEqual(["a", "b", "d", "c", "e"]);
  });
});

describe("a static Table resource's paging", () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({ id: `r${index}` }));

  it("answers a page past the end with the last page", () => {
    const result = queryPhiStaticTableResource(resource(rows), request({ page: 9, pageSize: 2 }));
    expect(result.page).toBe(3);
    expect(ids(result)).toEqual(["r4"]);
  });

  it("answers page 1 for an empty resource", () => {
    const result = queryPhiStaticTableResource(resource([]), request({ page: 4, pageSize: 2 }));
    expect(result.page).toBe(1);
    expect(result.rows).toEqual([]);
  });
});
