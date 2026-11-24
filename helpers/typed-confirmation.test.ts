import { describe, expect, it } from "vitest";

import { matchesPhiTypedConfirmation } from "./typed-confirmation";

describe("a typed confirmation", () => {
  it("takes the word as shown, in any case and with the spaces a copy brings along", () => {
    expect(matchesPhiTypedConfirmation("app", "app")).toBe(true);
    expect(matchesPhiTypedConfirmation("App", "app")).toBe(true);
    expect(matchesPhiTypedConfirmation("  ACCOUNTING \n", "accounting")).toBe(true);
  });

  it("refuses another word, a part of it, nothing, and a word nobody was asked for", () => {
    expect(matchesPhiTypedConfirmation("admin", "app")).toBe(false);
    expect(matchesPhiTypedConfirmation("ap", "app")).toBe(false);
    expect(matchesPhiTypedConfirmation("a pp", "app")).toBe(false);
    expect(matchesPhiTypedConfirmation("", "app")).toBe(false);
    expect(matchesPhiTypedConfirmation(undefined, "app")).toBe(false);
    expect(matchesPhiTypedConfirmation("", "  ")).toBe(false);
  });
});
