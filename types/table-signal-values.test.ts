import { describe, expect, it } from "vitest";

import { readPhiTableSelectionSignalValue } from "./table-signal-values";

describe("readPhiTableSelectionSignalValue", () => {
  it("reads identities alone where the placement names no fields", () => {
    expect(readPhiTableSelectionSignalValue({ selectedRowIdentities: ["3"] }))
      .toEqual({ selectedRowIdentities: ["3"] });
  });

  it("carries the named fields of the selected rows", () => {
    expect(readPhiTableSelectionSignalValue({
      selectedRowIdentities: [3],
      selectedRows: [{ rowIdentity: 3, values: { retired: true } }],
    })).toEqual({
      selectedRowIdentities: [3],
      selectedRows: [{ rowIdentity: 3, values: { retired: true } }],
    });
  });

  it("refuses a selection whose rows are malformed rather than dropping them", () => {
    expect(readPhiTableSelectionSignalValue({
      selectedRowIdentities: [3],
      selectedRows: [{ rowIdentity: 3, values: { nested: { retired: true } } }],
    })).toBeNull();
    expect(readPhiTableSelectionSignalValue({
      selectedRowIdentities: [3],
      selectedRows: [{ values: { retired: true } }],
    })).toBeNull();
  });
});
