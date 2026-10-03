import { describe, expect, it } from "vitest";

import { mergePhiTableQueryFilters } from "./table-binding";

/**
 * A fixed filter is the Page's, not the reader's: nothing the reader picks and nothing a signal hands in
 * may lift it, and its value keeps its own type.
 */
describe("mergePhiTableQueryFilters", () => {
  it("lays the outside over the reader, and the fixed filters over both", () => {
    expect(mergePhiTableQueryFilters(
      { filters: { kind: 1, status: "open" } },
      { filters: { kind: 2, unreadOnly: true } },
      { kind: 3 },
    )).toEqual({ kind: 3, status: "open", unreadOnly: true });
  });

  it("keeps a fixed number a number", () => {
    expect(mergePhiTableQueryFilters({}, undefined, { kind: 3 }).kind).toBe(3);
  });

  it("leaves the query alone where nothing is fixed", () => {
    expect(mergePhiTableQueryFilters({ filters: { status: "open" } }, undefined, undefined))
      .toEqual({ status: "open" });
  });
});
