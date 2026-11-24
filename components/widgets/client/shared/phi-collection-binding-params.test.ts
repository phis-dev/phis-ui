import { describe, expect, it } from "vitest";

import { layPhiCollectionBindingParams } from "./phi-collection-binding-params";

/** Another Widget's choice, forwarded by a Controller on every change of it (COLLECTIONS.md). */
describe("a Collection View's binding params", () => {
  it("lays a received set over its own and takes the same set again as no change", () => {
    expect(layPhiCollectionBindingParams({ ownFileNotice: "own" }, { userId: 8 })).toEqual({ ownFileNotice: "own", userId: 8 });
    expect(layPhiCollectionBindingParams({ ownFileNotice: "own", userId: 8 }, { userId: 8 })).toBeNull();
    expect(layPhiCollectionBindingParams({ userId: 8 }, { userId: 9 })).toEqual({ userId: 9 });
    // Nobody chosen is a choice of its own.
    expect(layPhiCollectionBindingParams({ userId: 8 }, { userId: null })).toEqual({ userId: null });
    expect(layPhiCollectionBindingParams({}, { userId: null })).toEqual({ userId: null });
    expect(layPhiCollectionBindingParams({ ids: [1, 2] }, { ids: [1, 2] })).toBeNull();
  });
});
