import { describe, expect, it } from "vitest";

import { readPhiFlagsFieldConfig, readPhiFlagsFieldValue, writePhiFlagsFieldValue } from "./flags-field";

const OPTIONS = [{ value: "1" }, { value: "2" }, { value: "4" }, { value: "8" }];

/** The `flags` Form field: several yes-or-no answers as one bit-flag number (FORMS.md). */
describe("a flags field", () => {
  it("folds the options checked into one number and keeps bits it does not offer", () => {
    const config = readPhiFlagsFieldConfig(undefined, OPTIONS);
    expect(writePhiFlagsFieldValue(config, 0, ["1", "4"])).toBe(5);
    expect(writePhiFlagsFieldValue(config, 16 | 1, ["2"])).toBe(16 | 2);
    expect(readPhiFlagsFieldValue("5")).toBe(0);
    expect(readPhiFlagsFieldValue(5)).toBe(5);
  });

  it("clears an option whose required one is unchecked", () => {
    const config = readPhiFlagsFieldConfig({ requires: { "4": "1", "8": "2" } }, OPTIONS);
    expect(writePhiFlagsFieldValue(config, 1 | 4, ["4"])).toBe(0);
    expect(writePhiFlagsFieldValue(config, 0, ["2", "8"])).toBe(10);
  });

  it("refuses an option that is no bit, a bit named twice and a dependency on no option", () => {
    expect(() => readPhiFlagsFieldConfig(undefined, [{ value: "3" }])).toThrow("no bit");
    expect(() => readPhiFlagsFieldConfig(undefined, [{ value: "1" }, { value: "1" }])).toThrow("twice");
    expect(() => readPhiFlagsFieldConfig({ requires: { "4": "16" } }, OPTIONS)).toThrow("requires");
  });
});
