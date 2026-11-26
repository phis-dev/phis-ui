import { describe, expect, it } from "vitest";

import type { PhiFormDescriptor } from "@phis/contracts/forms";

import { checkPhiPresetForms } from "../../helpers/preset-form-check";
import { checkPhiFormDescriptorFields } from "./form-descriptor-field-check";
import { PHI_FORM_FIELD_PROVIDER_KEYS } from "./form-provider-contract";

type Field = PhiFormDescriptor["fields"][number];

const money = (key: string, config: Record<string, unknown>): Field =>
  ({ key, fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.money, config }) as Field;
const text = (key: string): Field => ({ key, fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.text }) as Field;
const flags = (options: readonly string[], config?: Record<string, unknown>): Field => ({
  key: "purposes",
  fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.flags,
  options: options.map((value) => ({ value, label: { kind: "literal", value } })),
  config,
}) as Field;

/**
 * The rules a money or flags field's Control throws on, checked where the Form is made, so a Form that
 * breaks one fails a package's tests and the Site's catalog instead of a live page.
 */
describe("a Form's fields against their Controls' rules", () => {
  it("refuses a money currency that is no ISO 4217 code a payment accepts", () => {
    expect(checkPhiFormDescriptorFields({ fields: [money("price", { currency: "CHF" })] })).toEqual([]);
    expect(checkPhiFormDescriptorFields({ fields: [money("price", { currency: "Franken" })] })[0])
      .toMatch(/^Field "price": .*ISO 4217/u);
  });

  it("refuses a currencyField that is no other field of the Form", () => {
    expect(checkPhiFormDescriptorFields({ fields: [text("currency"), money("amount", { currencyField: "currency" })] })).toEqual([]);
    expect(checkPhiFormDescriptorFields({ fields: [money("amount", { currencyField: "currency" })] })).toEqual([
      'Field "amount" takes its currency from "currency", which is no other field of its Form.',
    ]);
    expect(checkPhiFormDescriptorFields({ fields: [money("amount", { currencyField: "amount" })] })).toEqual([
      'Field "amount" takes its currency from "amount", which is no other field of its Form.',
    ]);
  });

  it("refuses a flags option that is no bit, and a bit named twice", () => {
    expect(checkPhiFormDescriptorFields({ fields: [flags(["1", "2", "4"], { requires: { "4": "2" } })] })).toEqual([]);
    expect(checkPhiFormDescriptorFields({ fields: [flags(["1", "3"])] })[0]).toMatch(/"3" is no bit/u);
    expect(checkPhiFormDescriptorFields({ fields: [flags(["1", "1"])] })[0]).toMatch(/names the bit 1 twice/u);
  });

  it("takes an emptyOption on a select field and refuses it on any other", () => {
    const emptyOption = { label: { kind: "literal" as const, value: "None" } };
    const options = [{ value: "a", label: { kind: "literal" as const, value: "A" } }];
    expect(checkPhiFormDescriptorFields({
      fields: [{ key: "pick", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.select, options, emptyOption }],
    })).toEqual([]);
    expect(checkPhiFormDescriptorFields({
      fields: [{ key: "pick", fieldProviderKey: PHI_FORM_FIELD_PROVIDER_KEYS.segmented, options, emptyOption }],
    })).toEqual(['Field "pick" declares an emptyOption, which only a select field draws.']);
  });

  it("is what checkPhiPresetForms reports, under the Form's id", () => {
    expect(checkPhiPresetForms([
      { formId: "@acme/shop/modules/shop/forms/price", descriptor: { fields: [money("amount", { currencyField: "currency" })] } },
      { formId: "@acme/shop/modules/shop/forms/fine", descriptor: { fields: [money("amount", { currency: "EUR" })] } },
    ])).toEqual([{
      node: "@acme/shop/modules/shop/forms/price",
      message: 'Field "amount" takes its currency from "currency", which is no other field of its Form.',
    }]);
  });
});
