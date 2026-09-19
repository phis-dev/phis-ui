import { describe, expect, it } from "vitest";

import {
  PHI_FORM_STACKED_LAYOUT,
  phiFormActionsGridColumn,
  resolvePhiFormLayout,
} from "./form-descriptor-contract";

/**
 * Where the Form Widget's submit stands, against where the inputs above it stand.
 *
 * `start` is the default alignment and it means under the first input, not at the form's left edge. The
 * actions row used to name the label column outright -- line 7, or whatever a Form Layout had moved it
 * to -- which is the same line only for a form that puts its labels beside its controls. A form whose
 * labels stand on top of them has no label column at all, and its button was indented six tracks past
 * every input it submitted. So what is pinned here is not the number: it is that the row takes the same
 * range as the controls, whatever the layout says that is.
 */

describe("the row the Widget's submit stands in", () => {
  it("starts where the inputs start when the labels stand above them", () => {
    const layout = resolvePhiFormLayout(PHI_FORM_STACKED_LAYOUT);

    expect(phiFormActionsGridColumn(layout, "compact")).toBe("1 / 25");
    expect(phiFormActionsGridColumn(layout, "medium")).toBe("1 / 25");
    expect(phiFormActionsGridColumn(layout, "wide")).toBe("1 / 25");
  });

  it("follows the label column a Form Layout may move when the labels stand beside the controls", () => {
    const layout = resolvePhiFormLayout(undefined);

    // Compact is one column for every form: the labels are on top there too.
    expect(phiFormActionsGridColumn(layout, "compact")).toBe("1 / 25");
    expect(phiFormActionsGridColumn(layout, "medium")).toBe("var(--phi-form-label-end, 7) / 25");
    expect(phiFormActionsGridColumn(layout, "wide")).toBe("var(--phi-form-label-end, 7) / 25");
  });

  it("takes a form's own control range when that form places its columns itself", () => {
    // Half the width for the labels, so the button is not under the inputs at line 7 either.
    const layout = resolvePhiFormLayout({
      label: { compact: { start: 1, end: 25 }, medium: { start: 1, end: 13 }, wide: { start: 1, end: 13 } },
      control: { compact: { start: 1, end: 25 }, medium: { start: 13, end: 25 }, wide: { start: 13, end: 25 } },
    });

    expect(phiFormActionsGridColumn(layout, "medium")).toBe("var(--phi-form-label-end, 13) / 25");
  });
});
