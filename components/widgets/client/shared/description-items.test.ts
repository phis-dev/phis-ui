import { describe, expect, it } from "vitest";

import { resizePhiDescriptionItems } from "./description-items";

describe("resizing a description's items", () => {
  it("keeps the entries a longer list still has and starts the new ones empty", () => {
    expect(resizePhiDescriptionItems([{ text: "a" }, { text: "b" }], 4))
      .toEqual([{ text: "a" }, { text: "b" }, { text: "" }, { text: "" }]);
  });

  it("drops only the tail of a shorter list", () => {
    expect(resizePhiDescriptionItems([{ text: "a" }, { text: "b" }, { text: "c" }], 1)).toEqual([{ text: "a" }]);
  });

  it("reads a cleared field as no answer rather than as zero items", () => {
    expect(resizePhiDescriptionItems([{ text: "a" }, { text: "b" }], null)).toEqual([{ text: "a" }, { text: "b" }]);
  });

  it("holds the count to what the widget offers", () => {
    expect(resizePhiDescriptionItems([], 40)).toHaveLength(12);
    expect(resizePhiDescriptionItems([{ text: "a" }], -3)).toEqual([]);
  });

  it("starts a new entry at the level of the one before it", () => {
    expect(resizePhiDescriptionItems([{ text: "a" }, { text: "b", level: 2 }], 3)[2]).toEqual({ text: "", level: 2 });
  });
});
