import { describe, expect, it } from "vitest";

import { formatPhiTranslation } from "./translation-format";

describe("formatPhiTranslation", () => {
  it("reads positional tokens in one pass, so %1 does not eat %10", () => {
    const values = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    expect(formatPhiTranslation("%1 and %10", values)).toBe("a and j");
    expect(formatPhiTranslation("{0} and {9}", values)).toBe("a and j");
  });

  it("does not replace inside a value it just inserted", () => {
    expect(formatPhiTranslation("%1 %2", ["%2", "x"])).toBe("%2 x");
  });

  it("leaves a token nothing answers", () => {
    expect(formatPhiTranslation("%1 %3", ["a", "b"])).toBe("a %3");
    expect(formatPhiTranslation("{name} {other}", { name: "n" })).toBe("n {other}");
  });

  it("takes a single value as the first position", () => {
    expect(formatPhiTranslation("%1 / {0} / %2", 7)).toBe("7 / 7 / %2");
  });
});
