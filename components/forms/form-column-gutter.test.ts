import { describe, expect, it } from "vitest";

import {
  PHI_FORM_SIDE_END_HALF,
  PHI_FORM_SIDE_START_HALF,
  PHI_FORM_STACKED_END_HALF,
  PHI_FORM_STACKED_FULL,
  phiFormCellOpensColumn,
  resolvePhiFormLayout,
} from "./form-descriptor-contract";

/**
 * What stands between the two columns of a two-column form.
 *
 * The grid says nothing about it: its `column-gap` is 0 and has to stay 0, because a gap there falls
 * between a label and its own control as readily as between one field and the next, and those are not
 * the same distance. So the distance is laid on the one cell that opens a column, and what is pinned
 * here is which cell that is -- the left column is never moved, or the form would come off the left edge
 * of the box it stands in.
 */

describe("the cell a column gap is laid on", () => {
  it("moves the label of the field in the second column, and not its control", () => {
    const left = PHI_FORM_SIDE_START_HALF;
    const right = PHI_FORM_SIDE_END_HALF;

    expect(phiFormCellOpensColumn(right.label.medium, right.control.medium)).toBe(true);
    expect(phiFormCellOpensColumn(right.control.medium, right.label.medium)).toBe(false);
    expect(phiFormCellOpensColumn(left.label.medium, left.control.medium)).toBe(false);
    expect(phiFormCellOpensColumn(left.control.medium, left.label.medium)).toBe(false);
  });

  it("moves both parts of a field stacked in the second column, because both begin there", () => {
    const stacked = PHI_FORM_STACKED_END_HALF;

    expect(phiFormCellOpensColumn(stacked.label.medium, stacked.control.medium)).toBe(true);
    expect(phiFormCellOpensColumn(stacked.control.medium, stacked.label.medium)).toBe(true);
  });

  it("moves nothing at compact, where every field takes the whole width", () => {
    const right = PHI_FORM_SIDE_END_HALF;

    expect(phiFormCellOpensColumn(right.label.compact, right.control.compact)).toBe(false);
    expect(phiFormCellOpensColumn(right.control.compact, right.label.compact)).toBe(false);
  });

  it("moves nothing in a row that runs the full width", () => {
    const full = PHI_FORM_STACKED_FULL;

    expect(phiFormCellOpensColumn(full.label.medium, full.control.medium)).toBe(false);
    expect(phiFormCellOpensColumn(full.control.medium, full.label.medium)).toBe(false);
  });
});

describe("how wide that gap is", () => {
  it("follows the row gap where the form states none of its own", () => {
    const layout = resolvePhiFormLayout(undefined);

    expect(layout.columnGap).toEqual(layout.gap);
  });

  it("follows the stated row gap rather than the house one", () => {
    const layout = resolvePhiFormLayout({ gap: { compact: "xs", medium: "lg", wide: "lg" } });

    expect(layout.columnGap).toEqual({ compact: "xs", medium: "lg", wide: "lg" });
  });

  it("is the form's own answer where it gives one", () => {
    const layout = resolvePhiFormLayout({
      gap: { compact: "sm", medium: "base", wide: "base" },
      columnGap: { compact: "none", medium: "lg", wide: "xl" },
    });

    expect(layout.columnGap).toEqual({ compact: "none", medium: "lg", wide: "xl" });
    expect(layout.gap).toEqual({ compact: "sm", medium: "base", wide: "base" });
  });
});
