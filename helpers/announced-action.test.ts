import { describe, expect, it } from "vitest";

import { PHI_SIGNAL_VALUE_SCHEMAS } from "../types/signals";
import { readPhiCollectionActionSignalValue } from "../types/collection-signal-values";
import { isPhiAnnouncedActionSchema, readPhiAnnouncedAction } from "./announced-action";

describe("a Collection View's action", () => {
  it("reads the action, the item's key and the query, and refuses what names no action or a bad key", () => {
    expect(readPhiCollectionActionSignalValue({ actionKey: " edit ", itemKey: 7 })).toEqual({ actionKey: "edit", itemKey: 7 });
    expect(readPhiCollectionActionSignalValue({ actionKey: "create", query: { page: 1 } })).toEqual({ actionKey: "create", query: { page: 1 } });
    expect(readPhiCollectionActionSignalValue({ actionKey: "edit", itemKey: null })).toEqual({ actionKey: "edit" });
    expect(readPhiCollectionActionSignalValue({ actionKey: "" })).toBeNull();
    expect(readPhiCollectionActionSignalValue({ actionKey: "edit", itemKey: { id: 7 } })).toBeNull();
    expect(readPhiCollectionActionSignalValue({ actionKey: "edit", itemKey: " " })).toBeNull();
    expect(readPhiCollectionActionSignalValue("edit")).toBeNull();
  });
});

describe("an announced action", () => {
  it("is a Table's row action or a Collection View's item action, the record their row or item", () => {
    expect(readPhiAnnouncedAction(PHI_SIGNAL_VALUE_SCHEMAS.tableAction, { actionKey: "edit", rowIdentity: 3, selectedRowIdentities: [] }))
      .toEqual({ actionKey: "edit", recordKey: 3 });
    expect(readPhiAnnouncedAction(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction, { actionKey: "edit", itemKey: "a-1" }))
      .toEqual({ actionKey: "edit", recordKey: "a-1" });
    expect(readPhiAnnouncedAction(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction, { actionKey: "create" }))
      .toEqual({ actionKey: "create", recordKey: null });
    expect(readPhiAnnouncedAction(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction, { itemKey: 1 })).toBeNull();
    // Any other schema is no announcement, and a route of it is left to its own reading.
    expect(readPhiAnnouncedAction(PHI_SIGNAL_VALUE_SCHEMAS.formValues, { actionKey: "edit" })).toBeUndefined();
    expect(readPhiAnnouncedAction(null, null)).toBeUndefined();
    expect(isPhiAnnouncedActionSchema(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction)).toBe(true);
    expect(isPhiAnnouncedActionSchema(PHI_SIGNAL_VALUE_SCHEMAS.tableSelection)).toBe(false);
  });
});
