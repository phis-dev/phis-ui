import { describe, expect, it } from "vitest";

import { readPhiButtonVariant, resolvePhiButtonVariantPresentation } from "./button-variant";

describe("button variant presentation", () => {
  it("draws a gradient Button as a primary one with the slot it names, the first by default", () => {
    expect(resolvePhiButtonVariantPresentation("gradient", "gradient3")).toEqual({ type: "primary", gradient: "gradient3" });
    expect(resolvePhiButtonVariantPresentation("gradient")).toEqual({ type: "primary", gradient: "gradient1" });
  });

  it("draws a glass Button as the plain one with a pane", () => {
    expect(resolvePhiButtonVariantPresentation("glass")).toEqual({ type: "default", glass: true });
  });

  it("keeps the other variants to their primitive type and reads the new ones from a config", () => {
    expect(resolvePhiButtonVariantPresentation("subtle", "gradient2")).toEqual({ type: "text" });
    expect(resolvePhiButtonVariantPresentation(undefined)).toEqual({});
    expect(readPhiButtonVariant("glass")).toBe("glass");
    expect(readPhiButtonVariant("chrome")).toBeUndefined();
  });
});
