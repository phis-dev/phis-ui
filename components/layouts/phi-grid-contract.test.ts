import { describe, expect, it } from "vitest";

import { PHI_GRID_LAYOUT_DEFAULT_SPAN, resolvePhiGridSlotColumns } from "./phi-grid-contract";

/*
 * Slots flow. A slot with no offset starts where the one before it ended, and a row holds as many as
 * fit; written as absolute lines, three six-track cards all started on column 1 and stood under one
 * another.
 */
describe("where the Grid's slots stand", () => {
  it("lays slots without offsets side by side", () => {
    const columns = resolvePhiGridSlotColumns(undefined, [0, 1, 2], "medium", 6);
    expect(columns.get(0)).toEqual({ start: 1, span: 6 });
    expect(columns.get(1)).toEqual({ start: 7, span: 6 });
    expect(columns.get(2)).toEqual({ start: 13, span: 6 });
  });

  it("wraps to the next row when a slot no longer fits", () => {
    const columns = resolvePhiGridSlotColumns(undefined, [0, 1, 2], "medium", 12);
    expect(columns.get(2)).toEqual({ start: 1, span: 12 });
  });

  it("counts an offset as unused columns before the slot", () => {
    const columns = resolvePhiGridSlotColumns(
      [{ slotIndex: 1, offset: { compact: 2 }, span: { compact: 8 } }],
      [0, 1],
      "wide",
      6,
    );
    expect(columns.get(0)).toEqual({ start: 1, span: 6 });
    expect(columns.get(1)).toEqual({ start: 9, span: 8 });
  });

  it("starts a full-width slot on its own row and the next one on a fresh row", () => {
    const columns = resolvePhiGridSlotColumns(
      [{ slotIndex: 1, span: { compact: 24 } }],
      [0, 1, 2],
      "compact",
      6,
    );
    expect(columns.get(1)).toEqual({ start: 1, span: 24 });
    expect(columns.get(2)).toEqual({ start: 1, span: 6 });
  });
});

/*
 * A Grid nobody told still answers the room.
 *
 * The default used to be one number for all three profiles, so a Grid whose slots carry no span stood
 * four abreast at every width and only grew narrower.
 */
describe("what a slot spans when nothing was authored", () => {
  const columnsFor = (profile: "compact" | "medium" | "wide") =>
    resolvePhiGridSlotColumns(undefined, [0, 1, 2, 3], profile, PHI_GRID_LAYOUT_DEFAULT_SPAN[profile]);

  it("gives each slot the whole row where there is no room to share", () => {
    const columns = columnsFor("compact");
    expect(columns.get(0)).toEqual({ start: 1, span: 24 });
    expect(columns.get(1)).toEqual({ start: 1, span: 24 });
    expect(columns.get(3)).toEqual({ start: 1, span: 24 });
  });

  it("puts two abreast in the middle", () => {
    const columns = columnsFor("medium");
    expect(columns.get(0)).toEqual({ start: 1, span: 12 });
    expect(columns.get(1)).toEqual({ start: 13, span: 12 });
    expect(columns.get(2)).toEqual({ start: 1, span: 12 });
  });

  it("puts four abreast where the Grid is as wide as the content column", () => {
    const columns = columnsFor("wide");
    expect(columns.get(0)).toEqual({ start: 1, span: 6 });
    expect(columns.get(3)).toEqual({ start: 19, span: 6 });
  });

  it("clamps an offset away where the default already fills the row", () => {
    const columns = resolvePhiGridSlotColumns(
      [{ slotIndex: 0, offset: { compact: 4 } }],
      [0],
      "compact",
      PHI_GRID_LAYOUT_DEFAULT_SPAN.compact,
    );
    expect(columns.get(0)).toEqual({ start: 1, span: 24 });
  });
});
