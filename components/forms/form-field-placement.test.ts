import { describe, expect, it } from "vitest";

import {
  PHI_FORM_SIDE_START_HALF,
  parsePhiFormDescriptor,
  resolvePhiFormFieldRanges,
  resolvePhiFormLayout,
} from "./form-descriptor-contract";
import { PHI_CONFIRM_FORM_DESCRIPTOR } from "./shared-form-descriptors";

const range = { compact: { start: 7, end: 19 } };

function descriptorWithPlacement(placement: unknown) {
  return {
    ...PHI_CONFIRM_FORM_DESCRIPTOR,
    fields: [{ ...PHI_CONFIRM_FORM_DESCRIPTOR.fields[0], placement }],
  };
}

/**
 * A placement with one part took the other from the layout, and a control moved to 7-19 beside a
 * layout label at 1-9 overlapped it: the field stacked on two rows without anyone having asked for it.
 */
describe("a field's own placement", () => {
  it("is refused when it states only the control", () => {
    expect(() => parsePhiFormDescriptor(descriptorWithPlacement({ control: range })))
      .toThrow(/placement must state both label and control/u);
  });

  it("is refused when it states only the label", () => {
    expect(() => parsePhiFormDescriptor(descriptorWithPlacement({ label: range })))
      .toThrow(/placement must state both label and control/u);
  });

  it("is kept when it states both parts", () => {
    const parsed = parsePhiFormDescriptor(descriptorWithPlacement(PHI_FORM_SIDE_START_HALF));
    expect(parsed.fields[0]?.placement).toEqual(PHI_FORM_SIDE_START_HALF);
  });

  it("may be left out, and the field takes the layout's ranges", () => {
    const parsed = parsePhiFormDescriptor(descriptorWithPlacement(undefined));
    expect(parsed.fields[0]?.placement).toBeUndefined();
    const layout = resolvePhiFormLayout(undefined);
    expect(resolvePhiFormFieldRanges(layout, undefined, "medium", "field")).toEqual({
      label: layout.label.medium,
      control: layout.control.medium,
      stacked: false,
    });
  });
});
