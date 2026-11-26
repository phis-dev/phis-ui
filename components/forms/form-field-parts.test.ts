import { describe, expect, it } from "vitest";

import {
  PHI_FORM_STACKED_LAYOUT,
  phiFormPartProperties,
  resolvePhiFormLayout,
} from "./form-descriptor-contract";
import { PHI_FORM_FIELD_PROVIDER_KEYS, PHI_FORM_PART_ROWS_FIELD_PROVIDER_KEYS } from "./form-provider-contract";

/*
 * A field of labelled parts (the address) draws each part as a row of the Form's template, from the
 * columns the Form writes: the address once stacked its labels inside the control column of a one-column
 * dialog whose other fields had theirs beside them (owner, 2026-11-26).
 */
describe("phiFormPartProperties", () => {
  const properties = (layout: Parameters<typeof resolvePhiFormLayout>[0], mode: "compact" | "medium" | "wide") =>
    Object.fromEntries(phiFormPartProperties(resolvePhiFormLayout(layout), mode));

  it("puts a part's label in the template's label column beside its input from medium up", () => {
    expect(properties(undefined, "medium")).toEqual({
      "--phi-form-part-label-columns-medium": "1 / var(--phi-form-label-end, 11)",
      "--phi-form-part-control-columns-medium": "var(--phi-form-label-end, 11) / 25",
      "--phi-form-part-label-height-medium": "var(--phi-form-label-min-height)",
      "--phi-form-part-label-pad-medium": "var(--phi-form-label-gutter-medium)",
      "--phi-form-part-label-gap-medium": "0px",
    });
    expect(properties(undefined, "wide")["--phi-form-part-label-columns-wide"]).toBe("1 / var(--phi-form-label-end, 9)");
  });

  it("stacks a part's label above its input where the template stacks every label", () => {
    expect(properties(undefined, "compact")).toEqual({
      "--phi-form-part-label-columns-compact": "1 / 25",
      "--phi-form-part-control-columns-compact": "1 / 25",
      "--phi-form-part-label-height-compact": "auto",
      "--phi-form-part-label-pad-compact": "0px",
      "--phi-form-part-label-gap-compact": "calc(var(--phi-form-row-gap-compact) / 4)",
    });
    expect(properties(PHI_FORM_STACKED_LAYOUT, "wide")["--phi-form-part-label-height-wide"]).toBe("auto");
  });

  it("lists the address as a field drawn in parts", () => {
    expect(PHI_FORM_PART_ROWS_FIELD_PROVIDER_KEYS.has(PHI_FORM_FIELD_PROVIDER_KEYS.address)).toBe(true);
  });
});
