import { describe, expect, it } from "vitest";

import { readPhiControlOptions } from "../controls/phi-control-options";
import { parsePhiFormDescriptor } from "./form-descriptor-contract";
import {
  evaluatePhiRuntimeConditionExpression,
  readPhiRuntimeConditionExpression,
  type PhiRuntimeConditionExpression,
} from "../../types/runtime-condition";
import { collectFormOptionFlagFieldKeys, resolveFormChosenOptionFlags } from "./form-option-flags";

const EXTERNAL = 1;
const CODE_CHANGE = 2;

const externalChosen = {
  source: "form",
  valuePath: "typeKey",
  operator: "optionFlag",
  flag: EXTERNAL,
} as const satisfies PhiRuntimeConditionExpression;

function descriptor(fields: unknown[]): unknown {
  return { schemaVersion: 1, key: "test/form", fields };
}

const typeField = {
  key: "typeKey",
  fieldProviderKey: "@phis/ui/forms/fields/select",
  options: [
    { value: "bug", label: { kind: "literal", value: "Bug" }, flags: EXTERNAL | CODE_CHANGE },
    { value: "billing", label: { kind: "literal", value: "Billing" } },
  ],
};
const consentField = {
  key: "acknowledgedExternal",
  fieldProviderKey: "@phis/ui/forms/fields/checkbox",
  visibleWhen: externalChosen,
};

describe("option flags", () => {
  it("are read from an option as a whole number, and nothing else is", () => {
    const [flagged, zero, negative, fraction, text, huge] = readPhiControlOptions([
      { value: "a", flags: 5 },
      { value: "b", flags: 0 },
      { value: "c", flags: -1 },
      { value: "d", flags: 1.5 },
      { value: "e", flags: "1" },
      { value: "f", flags: 2 ** 31 },
    ]);
    expect(flagged?.flags).toBe(5);
    for (const option of [zero, negative, fraction, text, huge]) expect(option?.flags).toBeUndefined();
  });

  it("are kept by the Form descriptor's options, and a value that is not a flag set is refused", () => {
    const parsed = parsePhiFormDescriptor(descriptor([typeField, consentField]));
    expect(parsed.fields[0]?.options?.map((option) => option.flags)).toEqual([EXTERNAL | CODE_CHANGE, undefined]);
    expect(() => parsePhiFormDescriptor(descriptor([
      { ...typeField, options: [{ value: "bug", label: { kind: "literal", value: "Bug" }, flags: "1" }] },
    ]))).toThrow(/options\[0\]\.flags/);
  });
});

describe("the optionFlag condition", () => {
  it("is read only from the form, with a flag and without a value", () => {
    expect(readPhiRuntimeConditionExpression(externalChosen)).toEqual({
      source: "form",
      valuePath: "typeKey",
      operator: "optionFlag",
      flag: EXTERNAL,
      controllerAddress: undefined,
      widgetAddress: undefined,
      whenUnavailable: undefined,
      value: undefined,
      reason: undefined,
    });
    expect(readPhiRuntimeConditionExpression({ ...externalChosen, source: "row" })).toBeNull();
    expect(readPhiRuntimeConditionExpression({ ...externalChosen, flag: 0 })).toBeNull();
    expect(readPhiRuntimeConditionExpression({ ...externalChosen, flag: undefined })).toBeNull();
    expect(readPhiRuntimeConditionExpression({ ...externalChosen, value: "1" })).toBeNull();
    expect(readPhiRuntimeConditionExpression({ source: "form", valuePath: "typeKey", operator: "equals", value: "bug", flag: 1 }))
      .toBeNull();
  });

  it("holds where the chosen option carries every bit asked, and is unavailable while nobody knows it", () => {
    expect(evaluatePhiRuntimeConditionExpression(externalChosen, { form: {}, formOptionFlags: { typeKey: 3 } }))
      .toBe("matched");
    expect(evaluatePhiRuntimeConditionExpression(externalChosen, { form: {}, formOptionFlags: { typeKey: 2 } }))
      .toBe("not-matched");
    expect(evaluatePhiRuntimeConditionExpression({ ...externalChosen, flag: 3 }, { formOptionFlags: { typeKey: 1 } }))
      .toBe("not-matched");
    expect(evaluatePhiRuntimeConditionExpression(externalChosen, { form: { typeKey: "bug" }, formOptionFlags: {} }))
      .toBe("unavailable");
    expect(evaluatePhiRuntimeConditionExpression({ ...externalChosen, whenUnavailable: "matched" }, { formOptionFlags: {} }))
      .toBe("matched");
  });

  it("must name another field of the Form that offers options", () => {
    expect(() => parsePhiFormDescriptor(descriptor([consentField]))).toThrow(/no other field of this Form/);
    expect(() => parsePhiFormDescriptor(descriptor([{ ...typeField, options: undefined }, consentField])))
      .toThrow(/no other field of this Form/);
    expect(() => parsePhiFormDescriptor(descriptor([
      { ...typeField, options: undefined, optionsProvider: { providerKey: "@phis/support/request-types" } },
      consentField,
    ]))).not.toThrow();
  });
});

describe("the flags of what a field holds", () => {
  const options = [
    { value: "bug", flags: EXTERNAL | CODE_CHANGE },
    { value: "billing" },
    { value: "docs", flags: EXTERNAL },
  ];

  it("are the chosen option's, every chosen option's together, and 0 for nothing held", () => {
    expect(resolveFormChosenOptionFlags(options, "bug")).toBe(3);
    expect(resolveFormChosenOptionFlags(options, "billing")).toBe(0);
    expect(resolveFormChosenOptionFlags(options, ["billing", "docs"])).toBe(EXTERNAL);
    expect(resolveFormChosenOptionFlags(options, undefined)).toBe(0);
    expect(resolveFormChosenOptionFlags(options, "")).toBe(0);
    expect(resolveFormChosenOptionFlags([], undefined)).toBe(0);
  });

  it("are unknown while a held value is among none of the options", () => {
    expect(resolveFormChosenOptionFlags([], "bug")).toBeUndefined();
    expect(resolveFormChosenOptionFlags(undefined, "bug")).toBeUndefined();
    expect(resolveFormChosenOptionFlags(options, ["bug", "gone"])).toBeUndefined();
  });

  it("are asked only of the fields an optionFlag condition names", () => {
    const parsed = parsePhiFormDescriptor(descriptor([
      typeField,
      consentField,
      { key: "note", fieldProviderKey: "@phis/ui/forms/fields/text", disabledWhen: { source: "form", valuePath: "typeKey", operator: "truthy" } },
    ]));
    expect([...collectFormOptionFlagFieldKeys(parsed.fields)]).toEqual(["typeKey"]);
  });
});
