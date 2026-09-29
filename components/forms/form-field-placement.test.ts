import { describe, expect, it } from "vitest";

import {
  PHI_FORM_GRID_LAST_LINE,
  PHI_FORM_ROW_FULL,
  PHI_FORM_SIDE_START_HALF,
  parsePhiFormDescriptor,
  phiFormFieldFollowsLayoutColumns,
  phiFormFlowHalfColumns,
  resolvePhiFormFieldRanges,
  resolvePhiFormGridPlacement,
  resolvePhiFormLayout,
} from "./form-descriptor-contract";
import { PHI_CONFIRM_FORM_DESCRIPTOR } from "./shared-form-descriptors";
import type { PhiFormFieldPlacementDescriptor } from "../../types/form-descriptor";

/** The default layout: label 1-9 beside control 9-25 from `medium` up, both 1-25 at `compact`. */
const layout = resolvePhiFormLayout(undefined);

function descriptorWithPlacement(placement: unknown) {
  return {
    ...PHI_CONFIRM_FORM_DESCRIPTOR,
    fields: [{ ...PHI_CONFIRM_FORM_DESCRIPTOR.fields[0], placement }],
  };
}

function placeOne(placement: PhiFormFieldPlacementDescriptor | undefined, hasLabel = true) {
  const placed = resolvePhiFormGridPlacement(
    layout,
    [{ key: "field", placement, inFlow: true, hasLabel }],
    "medium",
  );
  return placed.placements.get("field");
}

/**
 * `label` and `control` in a placement are column ranges, and one of them alone is a statement of its
 * own: the field has no column for the other part. The part left out was once taken from the layout,
 * and a control moved to 7-19 beside a layout label at 1-9 overlapped it and stacked without anyone
 * having asked for it (U17).
 */
describe("a field's own placement", () => {
  it("with only the control has no label column; the label stands above it in the same range", () => {
    const placement = { control: { medium: { start: 7, end: 19 } } };
    const parsed = parsePhiFormDescriptor(descriptorWithPlacement(placement));
    expect(parsed.fields[0]?.placement).toEqual(placement);

    expect(resolvePhiFormFieldRanges(layout, placement, "medium", "field")).toEqual({
      label: { start: 7, end: 19 },
      control: { start: 7, end: 19 },
      stacked: true,
    });
    expect(placeOne(placement)).toEqual({
      label: { start: 7, end: 19 },
      labelSlot: { start: 7, end: 19 },
      control: { start: 7, end: 19 },
      stacked: true,
      labelRow: 1,
      controlRow: 2,
    });
  });

  it("with only the control and no label text takes one row in that range", () => {
    const placement = { control: { medium: { start: 7, end: 19 } } };
    expect(placeOne(placement, false)).toMatchObject({
      control: { start: 7, end: 19 },
      stacked: false,
      labelRow: 1,
      controlRow: 1,
    });
  });

  it("with only the label has no control column; the label takes exactly its range", () => {
    const placement = { label: { medium: { start: 1, end: 13 } } };
    const parsed = parsePhiFormDescriptor(descriptorWithPlacement(placement));
    expect(parsed.fields[0]?.placement).toEqual(placement);

    expect(resolvePhiFormFieldRanges(layout, placement, "medium", "field")).toEqual({
      label: { start: 1, end: 13 },
      control: { start: 1, end: 13 },
      stacked: true,
    });
    expect(placeOne(placement)).toMatchObject({
      label: { start: 1, end: 13 },
      labelSlot: { start: 1, end: 13 },
      labelRow: 1,
    });
  });

  it("with both parts puts each in its own range", () => {
    const parsed = parsePhiFormDescriptor(descriptorWithPlacement(PHI_FORM_SIDE_START_HALF));
    expect(parsed.fields[0]?.placement).toEqual(PHI_FORM_SIDE_START_HALF);

    expect(resolvePhiFormFieldRanges(layout, PHI_FORM_SIDE_START_HALF, "medium", "field")).toEqual({
      label: { start: 1, end: 5 },
      control: { start: 5, end: 13 },
      stacked: false,
    });
  });

  it("left out, or stating neither part, takes the layout's ranges", () => {
    for (const placement of [undefined, {}]) {
      const parsed = parsePhiFormDescriptor(descriptorWithPlacement(placement));
      expect(parsed.fields[0]?.placement).toBeUndefined();
    }
    for (const placement of [undefined, {}]) {
      const ranges = resolvePhiFormFieldRanges(layout, placement, "medium", "field");
      expect(ranges).toEqual({
        label: layout.label.medium,
        control: layout.control.medium,
        stacked: false,
      });
      expect(phiFormFieldFollowsLayoutColumns({ placement, ...ranges })).toBe(true);
    }
  });

  it("with only the control may span the whole label and control width", () => {
    const placement = { control: PHI_FORM_ROW_FULL };
    const full = { start: 1, end: PHI_FORM_GRID_LAST_LINE };
    for (const mode of ["compact", "medium", "wide"] as const) {
      expect(resolvePhiFormFieldRanges(layout, placement, mode, "field")).toEqual({
        label: full,
        control: full,
        stacked: true,
      });
    }
    const ranges = resolvePhiFormFieldRanges(layout, placement, "medium", "field");
    expect(phiFormFieldFollowsLayoutColumns({ placement, ...ranges })).toBe(false);

    const placed = resolvePhiFormGridPlacement(layout, [
      { key: "wide", placement, inFlow: true, hasLabel: true },
      { key: "next", placement: undefined, inFlow: true, hasLabel: true },
    ], "medium");
    expect(placed.placements.get("next")?.labelRow).toBe(3);
  });

  it("with only the label may span the whole width too", () => {
    const placement = { label: PHI_FORM_ROW_FULL };
    expect(resolvePhiFormFieldRanges(layout, placement, "wide", "field")).toEqual({
      label: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
      control: { start: 1, end: PHI_FORM_GRID_LAST_LINE },
      stacked: true,
    });
  });

  it("is read per mode: a mode it states nothing for takes the layout for both parts", () => {
    const placement = { control: { medium: { start: 7, end: 19 } } };
    expect(resolvePhiFormFieldRanges(layout, placement, "compact", "field")).toEqual({
      label: layout.label.compact,
      control: layout.control.compact,
      stacked: true,
    });
    expect(resolvePhiFormFieldRanges(layout, placement, "wide", "field").control)
      .toEqual({ start: 7, end: 19 });
  });

  it("is read per mode: a part missing in one mode is not taken from the layout", () => {
    const placement = {
      label: { medium: { start: 1, end: 7 } },
      control: { compact: { start: 1, end: 13 }, medium: { start: 7, end: 25 } },
    };
    expect(resolvePhiFormFieldRanges(layout, placement, "compact", "field")).toEqual({
      label: { start: 1, end: 13 },
      control: { start: 1, end: 13 },
      stacked: true,
    });
    expect(resolvePhiFormFieldRanges(layout, placement, "medium", "field").stacked).toBe(false);
  });

  it("still has its ranges checked", () => {
    expect(() => parsePhiFormDescriptor(descriptorWithPlacement({
      control: { medium: { start: 9, end: 30 } },
    }))).toThrow(/placement\.control\.medium\.end must be an integer/u);
    expect(() => parsePhiFormDescriptor(descriptorWithPlacement({ label: {} })))
      .toThrow(/placement\.label must state a range/u);
    expect(() => parsePhiFormDescriptor(descriptorWithPlacement({ control: "full" })))
      .toThrow(/placement\.control must be a responsive grid range object/u);
  });

  it("counts as a whole row in a two-column flow when one part alone spans it", () => {
    const [first, second, third] = phiFormFlowHalfColumns([
      { ...PHI_CONFIRM_FORM_DESCRIPTOR.fields[0], key: "a" },
      { ...PHI_CONFIRM_FORM_DESCRIPTOR.fields[0], key: "b", placement: { control: PHI_FORM_ROW_FULL } },
      { ...PHI_CONFIRM_FORM_DESCRIPTOR.fields[0], key: "c" },
    ]);
    expect(first?.placement).toBe(PHI_FORM_SIDE_START_HALF);
    expect(second?.placement).toEqual({ control: PHI_FORM_ROW_FULL });
    expect(third?.placement).toBe(PHI_FORM_SIDE_START_HALF);
  });
});
