import { describe, expect, it } from "vitest";

import { readPhiSlotUploadAcceptance } from "./slot";

describe("what a slot offers its drop area", () => {
  it("offers nothing until the slot is known", () => {
    expect(readPhiSlotUploadAcceptance(null)).toBeNull();
  });

  it("takes one file where the slot holds one", () => {
    const read = readPhiSlotUploadAcceptance({
      name: "cover",
      cardinality: "one",
      maxBytes: 1000,
      contentTypes: ["image/png", "image/jpeg"],
    });
    expect(read).toEqual({
      accept: "image/png,image/jpeg",
      multiple: false,
      acceptance: { contentTypes: ["image/png", "image/jpeg"], maxBytes: 1000, multiple: false },
    });
  });

  it("takes several files where the slot holds many, with the same facts in dialog and check", () => {
    const read = readPhiSlotUploadAcceptance({
      name: "image",
      cardinality: "many",
      maxBytes: 5,
      contentTypes: ["image/webp"],
    });
    expect(read?.multiple).toBe(true);
    expect(read?.acceptance.multiple).toBe(true);
    expect(read?.accept).toBe("image/webp");
  });
});
