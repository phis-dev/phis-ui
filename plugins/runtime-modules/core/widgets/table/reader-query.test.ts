import { describe, expect, it } from "vitest";

import type { PhiTableFilterDefinition } from "../../../../../types/table-widget";
import { isTableQueryNarrowedByReader } from "./reader-query";

const filters: PhiTableFilterDefinition[] = [
  { key: "status", label: "Status", type: "select", options: [{ label: "Open", value: "open" }] },
  { key: "tags", label: "Tags", type: "select", multiple: true },
  { key: "name", label: "Name", type: "text" },
  { key: "archived", label: "Archived", type: "boolean", control: "switch" },
  { key: "created", label: "Created", type: "dateRange", startKey: "createdFrom", endKey: "createdTo" },
];

describe("isTableQueryNarrowedByReader", () => {
  it("is false for a query that carries nothing of the reader's", () => {
    expect(isTableQueryNarrowedByReader(filters, {})).toBe(false);
    expect(isTableQueryNarrowedByReader(undefined, { search: "" })).toBe(false);
    expect(isTableQueryNarrowedByReader(filters, { search: "   ", filters: { status: "", tags: [], name: "  ", archived: null } }))
      .toBe(false);
  });

  it("counts a search text, with or without filters of its own", () => {
    expect(isTableQueryNarrowedByReader(undefined, { search: "abc" })).toBe(true);
  });

  it("counts a filter of the Table's own that holds a value, a default and false included", () => {
    expect(isTableQueryNarrowedByReader(filters, { filters: { status: "open" } })).toBe(true);
    expect(isTableQueryNarrowedByReader(filters, { filters: { status: 7 } })).toBe(true);
    expect(isTableQueryNarrowedByReader(filters, { filters: { tags: ["a"] } })).toBe(true);
    expect(isTableQueryNarrowedByReader(filters, { filters: { name: "x" } })).toBe(true);
    expect(isTableQueryNarrowedByReader(filters, { filters: { archived: false } })).toBe(true);
    expect(isTableQueryNarrowedByReader(filters, { filters: { createdTo: "2026-01-01" } })).toBe(true);
  });

  it("does not count a key set by signal that is none of the Table's filters", () => {
    // The devices of a key: the key comes from a selection above, there is nothing here to adjust.
    expect(isTableQueryNarrowedByReader([], { filters: { keyId: "k1" } })).toBe(false);
    expect(isTableQueryNarrowedByReader(filters, { filters: { keyId: "k1" } })).toBe(false);
  });

  it("does not count a key the Page pins", () => {
    expect(isTableQueryNarrowedByReader(filters, { filters: { status: "open" } }, { status: "open" })).toBe(false);
    expect(isTableQueryNarrowedByReader(filters, { filters: { status: "open", name: "x" } }, { status: "open" })).toBe(true);
  });
});
