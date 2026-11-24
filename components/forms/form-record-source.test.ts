import { describe, expect, it, vi } from "vitest";

import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../types/signals";
import { createPhiCollectionProviderClient } from "../widgets/client/shared/phi-collection-provider";
import { readPhiFormRecordOpenKey, resolvePhiFormRecordSource } from "./form-record-source";

const source = { providerKey: "@phis/test/collections/items", resourceKey: "items" } as never;
const none = { provider: null, resource: null, bindingError: 'Table provider "x" is not available from the active runtime modules.' };

/** A record-bound Form opened from a Collection View's item (FORMS.md, "A record opened from a Collection View"). */
describe("a record-bound Form", () => {
  it("reads through a Collection Provider's readRecord where no Table Provider answers the key", () => {
    const readRecord = vi.fn();
    const collection = { provider: { readRecord }, resource: { recordRead: true }, bindingError: null };
    expect(resolvePhiFormRecordSource(source, none, collection)).toEqual({ read: readRecord, error: null });
    // A Table Provider under the key is read as before.
    const tableRead = vi.fn();
    expect(resolvePhiFormRecordSource(source, { provider: { readRecord: tableRead }, resource: { recordRead: true }, bindingError: null }, collection).read)
      .toBe(tableRead);
  });

  it("says why it cannot read: no Provider, a resource without recordRead, no source at all", () => {
    expect(resolvePhiFormRecordSource(source, none, { ...none, bindingError: "no collection" }).error).toBe(none.bindingError);
    expect(resolvePhiFormRecordSource(source, none, { provider: {}, resource: { recordRead: false }, bindingError: null }))
      .toEqual({ read: null, error: 'Collection resource "items" is not a Form record read source.' });
    expect(resolvePhiFormRecordSource(null, none, none)).toEqual({ read: null, error: null });
  });

  it("opens on a Table's row action and on a Collection View's item action of its key, and on nothing else", () => {
    expect(readPhiFormRecordOpenKey(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction, { actionKey: "edit", itemKey: 12 }, "edit")).toBe(12);
    expect(readPhiFormRecordOpenKey(PHI_SIGNAL_VALUE_SCHEMAS.tableAction, { actionKey: "edit", rowIdentity: 4, selectedRowIdentities: [] }, "edit")).toBe(4);
    expect(readPhiFormRecordOpenKey(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction, { actionKey: "delete", itemKey: 12 }, "edit")).toBeNull();
    expect(readPhiFormRecordOpenKey(PHI_SIGNAL_VALUE_SCHEMAS.collectionAction, { actionKey: "edit" }, "edit")).toBeNull();
    expect(readPhiFormRecordOpenKey(PHI_SIGNAL_VALUE_SCHEMAS.formValues, { actionKey: "edit", itemKey: 12 }, "edit")).toBeNull();
  });
});

describe("a Collection Provider Client", () => {
  it("refuses a resource that declares recordRead without readRecord", () => {
    const registration = {
      key: "@phis/test/collections/items",
      query: vi.fn(),
      resources: [{ resourceKey: "items", itemRendererKey: "@phis/test/renderers/item", recordRead: true }],
    } as never;
    expect(() => createPhiCollectionProviderClient(registration)).toThrow(/declares recordRead on resource "items" but has no readRecord/u);
    expect(() => createPhiCollectionProviderClient({ ...(registration as object), readRecord: vi.fn() } as never)).not.toThrow();
  });
});
