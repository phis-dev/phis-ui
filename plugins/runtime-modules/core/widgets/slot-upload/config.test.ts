import { describe, expect, it } from "vitest";

import { parsePhiSlotUploadWidgetConfig } from "./config";

/**
 * Reading a stored Slot upload field. The label is read strictly: text, or nothing at all.
 */
describe("what a Slot upload field accepts", () => {
  it("takes a written-out configuration as written", () => {
    expect(parsePhiSlotUploadWidgetConfig({
      label: "Cover picture",
      addon: "@phis/shop",
      table: "products",
      slot: "cover",
      ownerParam: "productId",
    })).toMatchObject({
      label: "Cover picture",
      addon: "@phis/shop",
      table: "products",
      slot: "cover",
      ownerParam: "productId",
    });
  });

  it("trims the label", () => {
    expect(parsePhiSlotUploadWidgetConfig({ label: "  Further pictures " }).label).toBe("Further pictures");
  });

  it("carries no label where none, null or only blanks were written", () => {
    for (const raw of [{}, { label: null }, { label: "   " }]) {
      expect(parsePhiSlotUploadWidgetConfig(raw)).not.toHaveProperty("label");
    }
  });

  it("refuses a label that is not text", () => {
    expect(() => parsePhiSlotUploadWidgetConfig({ label: 7 })).toThrow(/Invalid Slot upload label 7/u);
    expect(() => parsePhiSlotUploadWidgetConfig({ label: { en: "Cover" } })).toThrow(/Expected text/u);
  });

  it("reads the row from `id` where no parameter is named", () => {
    expect(parsePhiSlotUploadWidgetConfig({}).ownerParam).toBe("id");
  });
});
