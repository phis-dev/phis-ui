import { describe, expect, it } from "vitest";

import { findPhiCmsConfigViolations } from "./cms-config-field-validation";
import type { PhiCmsConfigField } from "../types/cms-plugins";

/**
 * The gate on the write path.
 *
 * The vocabulary of a setting is stated once, in the field that draws its control, so the same
 * declaration can say whether a value belongs. Reading stays forgiving -- a stored page that renders
 * beats one that refuses -- but nothing gets written that the declaration cannot account for.
 */

const CHOICE: PhiCmsConfigField = {
  key: "transition",
  type: "choice",
  label: "Transition",
  options: [{ value: "fade", label: "Fade" }, { value: "slide", label: "Slide" }],
};

const NUMBER: PhiCmsConfigField = {
  key: "durationMs",
  type: "number",
  label: "Duration",
  min: 100,
  max: 600_000,
};

describe("what may be written", () => {
  it("passes a value the declaration offers", () => {
    expect(findPhiCmsConfigViolations([CHOICE, NUMBER], { transition: "slide", durationMs: 480 }))
      .toEqual([]);
  });

  it("leaves a key nobody wrote alone", () => {
    expect(findPhiCmsConfigViolations([CHOICE, NUMBER], {})).toEqual([]);
  });

  it("allows clearing a setting", () => {
    // Absent and explicitly emptied are the same intent, and refusing the second would make a
    // setting impossible to take back once set.
    expect(findPhiCmsConfigViolations([CHOICE], { transition: null })).toEqual([]);
  });
});

describe("what is refused", () => {
  it("names the field and what it expected", () => {
    expect(findPhiCmsConfigViolations([CHOICE], { transition: "flip" }))
      .toEqual(["transition must be one of fade, slide, not \"flip\"."]);
  });

  it("holds a number to the bounds the field declares", () => {
    expect(findPhiCmsConfigViolations([NUMBER], { durationMs: 5 }))
      .toEqual(["durationMs must be at least 100, not 5."]);
    expect(findPhiCmsConfigViolations([NUMBER], { durationMs: 9_000_000 }))
      .toEqual(["durationMs must be at most 600000, not 9000000."]);
    expect(findPhiCmsConfigViolations([NUMBER], { durationMs: "480" }))
      .toEqual(["durationMs must be a number, not \"480\"."]);
  });

  it("checks every entry of a multiple choice", () => {
    const field: PhiCmsConfigField = { ...CHOICE, mode: "multiple", valueType: "string[]" };
    expect(findPhiCmsConfigViolations([field], { transition: ["fade", "flip"] }))
      .toHaveLength(1);
  });

  it("reports each bad field rather than only the first", () => {
    expect(findPhiCmsConfigViolations([CHOICE, NUMBER], { transition: "flip", durationMs: 5 }))
      .toHaveLength(2);
  });
});

describe("what it declines to judge", () => {
  it("lets an open list through, because there is no list to be outside of", () => {
    /*
     * A field whose options are fetched, or which accepts what somebody types, has no closed
     * vocabulary. Refusing here would reject perfectly good values on a slow connection.
     */
    const served: PhiCmsConfigField = {
      key: "form", type: "choice", label: "Form",
      optionsProvider: { providerKey: "@phis/ui/forms" },
    };
    const custom: PhiCmsConfigField = { ...CHOICE, allowCustom: true };
    expect(findPhiCmsConfigViolations([served], { form: "anything" })).toEqual([]);
    expect(findPhiCmsConfigViolations([custom], { transition: "flip" })).toEqual([]);
  });

  it("leaves structured settings to their own parsers", () => {
    // A padding or a background is a shape with a parser of its own, and guessing at it from a field
    // type would be a second, worse validator.
    const padding: PhiCmsConfigField = { key: "padding", type: "padding", label: "Padding" };
    expect(findPhiCmsConfigViolations([padding], { padding: { top: "nonsense" } })).toEqual([]);
  });
});
