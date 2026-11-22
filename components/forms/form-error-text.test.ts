import { describe, expect, it } from "vitest";

import { parsePhiFormDescriptor, resolvePhiFormErrorText } from "./form-descriptor-contract";

const OUT_OF_STOCK = {
  template: { kind: "label", key: "errors.outOfStockProduct", fallback: "\"%1\" is not in stock in that quantity." },
  params: ["product"],
  otherwise: { kind: "label", key: "errors.outOfStock", fallback: "Something in your cart is not in stock in that quantity." },
} as const;

function descriptor(errors: Record<string, unknown>) {
  return { schemaVersion: 1, key: "probe/form", fields: [], errors };
}

function parsedOutOfStock() {
  const entry = parsePhiFormDescriptor(descriptor({ out_of_stock: OUT_OF_STOCK })).errors?.out_of_stock;
  if (!entry) throw new Error("out_of_stock was not kept.");
  return entry;
}

/**
 * A refusal names what it refused (FORMS.md, Descriptor): the sentence is the Form's, translated, and the
 * value is the answer's, never translated.
 */
describe("a Form's refusal text with values of the refusal", () => {
  it("keeps a template entry through the parser, and a plain text as it was", () => {
    const parsed = parsePhiFormDescriptor(descriptor({
      out_of_stock: OUT_OF_STOCK,
      generic: { kind: "label", key: "errors.generic", fallback: "The order could not be placed." },
    }));
    expect(parsed.errors?.out_of_stock).toEqual(OUT_OF_STOCK);
    expect(parsed.errors?.generic).toEqual({ kind: "label", key: "errors.generic", fallback: "The order could not be placed." });
  });

  it("puts the answer's value where the template says %1", () => {
    expect(resolvePhiFormErrorText(parsedOutOfStock(), { code: "out_of_stock", product: "Private Cloud" }))
      .toBe("\"Private Cloud\" is not in stock in that quantity.");
  });

  it("fills the translated template, and leaves the value as the answer wrote it", () => {
    const labels = { "errors.outOfStockProduct": "„%1“ ist in dieser Menge nicht vorrätig." };
    expect(resolvePhiFormErrorText(parsedOutOfStock(), { product: "Private Cloud" }, labels))
      .toBe("„Private Cloud“ ist in dieser Menge nicht vorrätig.");
  });

  it("fills the values in the order the translation puts them, in one pass", () => {
    const entry = parsePhiFormDescriptor(descriptor({
      short: { template: { kind: "label", key: "errors.short", fallback: "Only %2 of %1 left." }, params: ["product", "left"], otherwise: { kind: "literal", value: "Not enough left." } },
    })).errors?.short;
    if (!entry) throw new Error("short was not kept.");
    expect(resolvePhiFormErrorText(entry, { product: "Lamp %2", left: 3 }, { "errors.short": "%1: nur noch %2." }))
      .toBe("Lamp %2: nur noch 3.");
  });

  it("says `otherwise` where the value is missing, empty, or neither a string nor a number", () => {
    const entry = parsedOutOfStock();
    const otherwise = "Something in your cart is not in stock in that quantity.";
    expect(resolvePhiFormErrorText(entry, { code: "out_of_stock" })).toBe(otherwise);
    expect(resolvePhiFormErrorText(entry, null)).toBe(otherwise);
    expect(resolvePhiFormErrorText(entry, { product: "  " })).toBe(otherwise);
    expect(resolvePhiFormErrorText(entry, { product: { title: "Lamp" } })).toBe(otherwise);
    expect(resolvePhiFormErrorText(entry, { product: Number.NaN })).toBe(otherwise);
    expect(resolvePhiFormErrorText(entry, { product: "Lamp" }, { "errors.outOfStock": "Etwas ist nicht vorrätig." }))
      .toBe("\"Lamp\" is not in stock in that quantity.");
    expect(resolvePhiFormErrorText(entry, {}, { "errors.outOfStock": "Etwas ist nicht vorrätig." }))
      .toBe("Etwas ist nicht vorrätig.");
  });

  it("refuses a template whose placeholders do not match its params", () => {
    const withTemplate = (fallback: string, params: unknown = ["product"]) =>
      () => parsePhiFormDescriptor(descriptor({ out_of_stock: { ...OUT_OF_STOCK, template: { kind: "label", key: "k", fallback }, params } }));
    expect(withTemplate("Not in stock.")).toThrow(/%1 to %1/u);
    expect(withTemplate("\"%1\" and %2.")).toThrow(/no other placeholder/u);
    expect(withTemplate("\"%2\" is short.")).toThrow(/no other placeholder/u);
    expect(withTemplate("\"%1\" is short.", ["product", "left"])).toThrow(/%1 to %2/u);
    expect(withTemplate("\"%1\" is %1.")).not.toThrow();
  });

  it("refuses params that are not field names, repeat, or are none", () => {
    const withParams = (params: unknown) => () => parsePhiFormDescriptor(descriptor({ out_of_stock: { ...OUT_OF_STOCK, params } }));
    expect(withParams([])).toThrow(/at least one/u);
    expect(withParams("product")).toThrow(/at least one/u);
    expect(withParams(["product.title"])).toThrow(/field name/u);
    expect(withParams([""])).toThrow(/field name/u);
    expect(withParams([1])).toThrow(/field name/u);
    expect(() => parsePhiFormDescriptor(descriptor({
      out_of_stock: { ...OUT_OF_STOCK, template: { kind: "literal", value: "%1 %2" }, params: ["product", "product"] },
    }))).toThrow(/twice/u);
  });

  it("refuses a template without `otherwise`, an `otherwise` with a placeholder, and params beside a plain text", () => {
    const { otherwise: _otherwise, ...withoutOtherwise } = OUT_OF_STOCK;
    expect(() => parsePhiFormDescriptor(descriptor({ out_of_stock: withoutOtherwise }))).toThrow(/otherwise must say/u);
    expect(() => parsePhiFormDescriptor(descriptor({
      out_of_stock: { ...OUT_OF_STOCK, otherwise: { kind: "literal", value: "%1 is short." } },
    }))).toThrow(/holds no placeholder/u);
    expect(() => parsePhiFormDescriptor(descriptor({
      out_of_stock: { kind: "label", key: "errors.outOfStock", fallback: "\"%1\" is short.", params: ["product"] },
    }))).toThrow(/without a template/u);
  });
});
