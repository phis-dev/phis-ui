import { describe, expect, it } from "vitest";

import { resizePhiDescriptionItems } from "./description-items";

describe("resizing a description's items", () => {
  it("keeps the entries a longer list still has and starts the new ones empty", () => {
    expect(resizePhiDescriptionItems(["a", "b"], 4)).toEqual(["a", "b", "", ""]);
  });

  it("drops only the tail of a shorter list", () => {
    expect(resizePhiDescriptionItems(["a", "b", "c"], 1)).toEqual(["a"]);
  });

  it("reads a cleared field as no answer rather than as zero items", () => {
    expect(resizePhiDescriptionItems(["a", "b"], null)).toEqual(["a", "b"]);
  });

  it("holds the count to what the widget offers", () => {
    expect(resizePhiDescriptionItems([], 40)).toHaveLength(12);
    expect(resizePhiDescriptionItems(["a"], -3)).toEqual([]);
  });
});
