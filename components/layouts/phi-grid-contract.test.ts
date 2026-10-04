import { describe, expect, it } from "vitest";

import {
  PHI_GRID_LAYOUT_DEFAULT_COLUMNS,
  resolvePhiGridColumns,
  resolvePhiGridSlotColumnProperties,
  resolvePhiGridSlotColumns,
  resolvePhiGridSlotGapShares,
  resolvePhiGridSlotPlacement,
  resolvePhiGridSlotProfileColumns,
} from "./phi-grid-contract";

/*
 * Slots flow. A slot with no indent starts where the one before it ended, and a row holds as many as
 * fit; written as absolute lines, three cards all started on column 1 and stood under one another.
 */
describe("where the Grid's slots stand", () => {
  it("lays slots without indents side by side", () => {
    const columns = resolvePhiGridSlotColumns(undefined, [0, 1, 2], "medium", 4);
    expect(columns.get(0)).toEqual({ start: 1, span: 6 });
    expect(columns.get(1)).toEqual({ start: 7, span: 6 });
    expect(columns.get(2)).toEqual({ start: 13, span: 6 });
  });

  it("wraps to the next row when a slot no longer fits", () => {
    const columns = resolvePhiGridSlotColumns(undefined, [0, 1, 2], "medium", 2);
    expect(columns.get(2)).toEqual({ start: 1, span: 12 });
  });

  it("counts an indent as unused columns before the slot", () => {
    const columns = resolvePhiGridSlotColumns(
      [{ slotIndex: 1, offset: { wide: 1 }, span: { wide: 2 } }],
      [0, 1],
      "wide",
      4,
    );
    expect(columns.get(0)).toEqual({ start: 1, span: 6 });
    expect(columns.get(1)).toEqual({ start: 13, span: 12 });
  });

  it("starts a whole-row slot on its own row and the next one on a fresh row", () => {
    const columns = resolvePhiGridSlotColumns(
      [{ slotIndex: 1, span: { wide: 4 } }],
      [0, 1, 2],
      "wide",
      4,
    );
    expect(columns.get(1)).toEqual({ start: 1, span: 24 });
    expect(columns.get(2)).toEqual({ start: 1, span: 6 });
  });
});

/*
 * A placement is counted in the Grid's columns at that width, and what it says of one width says
 * nothing of another: a column is something else at every width.
 */
describe("a slot's placement in columns", () => {
  it("turns columns into tracks", () => {
    expect(resolvePhiGridSlotPlacement([{ slotIndex: 0, span: { wide: 2 } }], 0, "wide", 3))
      .toEqual({ span: 16, offset: 0 });
  });

  it("does not carry a narrower width's placement to a wider one", () => {
    const placements = [{ slotIndex: 0, span: { medium: 2 }, offset: { medium: 0 } }];
    expect(resolvePhiGridSlotPlacement(placements, 0, "wide", 4)).toEqual({ span: 6, offset: 0 });
  });

  it("keeps a placement wider than the row to the row and drops an indent with no room", () => {
    const placements = [{ slotIndex: 0, span: { medium: 3 }, offset: { medium: 1 } }];
    expect(resolvePhiGridSlotPlacement(placements, 0, "medium", 2)).toEqual({ span: 24, offset: 0 });
  });
});

/*
 * A Grid nobody told still answers the room: one slot a row where there is no room to share, two in
 * the middle, four where the Grid is as wide as the content column.
 */
describe("how many slots a row holds", () => {
  it("defaults to one, two and four", () => {
    expect(resolvePhiGridColumns(undefined)).toEqual(PHI_GRID_LAYOUT_DEFAULT_COLUMNS);
    expect(PHI_GRID_LAYOUT_DEFAULT_COLUMNS).toEqual({ compact: 1, medium: 2, wide: 4 });
  });

  it("takes what was stated where it is a column count, and the default elsewhere", () => {
    expect(resolvePhiGridColumns({ medium: 3, wide: 5 })).toEqual({ compact: 1, medium: 3, wide: 4 });
  });

  it("gives each slot the whole row where it holds one", () => {
    const columns = resolvePhiGridSlotColumns(undefined, [0, 1], "compact", 1);
    expect(columns.get(0)).toEqual({ start: 1, span: 24 });
    expect(columns.get(1)).toEqual({ start: 1, span: 24 });
  });
});

/*
 * Every width's answer goes into the markup and a container query picks one, so the server's markup
 * stands where it stays rather than at `compact` until a measurement after hydration.
 */
describe("the columns a slot carries for every width", () => {
  it("answers each width with the Grid's own columns", () => {
    const columns = resolvePhiGridSlotProfileColumns(undefined, [0, 1]);
    expect(columns.get(1)).toEqual({
      compact: { start: 1, span: 24 },
      medium: { start: 13, span: 12 },
      wide: { start: 7, span: 6 },
    });
  });

  it("writes the three answers as the custom properties the stylesheet reads", () => {
    const columns = resolvePhiGridSlotProfileColumns(
      [{ slotIndex: 0, span: { medium: 2, wide: 1 } }],
      [0],
      { compact: 1, medium: 2, wide: 3 },
    );
    expect(resolvePhiGridSlotColumnProperties(columns.get(0))).toEqual({
      "--phi-grid-slot-columns-compact": "1 / span 24",
      "--phi-grid-slot-lead-compact": "0",
      "--phi-grid-slot-trail-compact": "0",
      "--phi-grid-slot-columns-medium": "1 / span 24",
      "--phi-grid-slot-lead-medium": "0",
      "--phi-grid-slot-trail-medium": "0",
      "--phi-grid-slot-columns-wide": "1 / span 8",
      "--phi-grid-slot-lead-wide": "0",
      "--phi-grid-slot-trail-wide": "16",
    });
  });

  it("writes nothing for a slot it has no columns for", () => {
    expect(resolvePhiGridSlotColumnProperties(undefined)).toEqual({});
  });
});

/*
 * The gap falls between slots, not between tracks. A `column-gap` on all 24 tracks made 23 gaps the
 * narrowest a Grid could be; each slot's share of the gap puts its edges where the `column-gap` did.
 */
describe("a slot's share of the column gap", () => {
  it("adds up to one whole gap between two slots in a row", () => {
    const first = resolvePhiGridSlotGapShares({ start: 1, span: 12 });
    const second = resolvePhiGridSlotGapShares({ start: 13, span: 12 });
    expect(first).toEqual({ lead: 0, trail: 12 });
    expect(second).toEqual({ lead: 12, trail: 0 });
    expect(first.trail + second.lead).toBe(24);
  });

  it("gives a full-width slot no inset at all", () => {
    expect(resolvePhiGridSlotGapShares({ start: 1, span: 24 })).toEqual({ lead: 0, trail: 0 });
  });

  it("puts each edge where a column-gap put it", () => {
    // A box W wide with gap g: a `column-gap` put a slot from (s - 1)(W + g) / 24 to
    // (s - 1 + n)(W + g) / 24 - g. Flush tracks put it from (s - 1) W / 24 to (s - 1 + n) W / 24.
    const width = 960;
    const gap = 16;
    for (const columns of [{ start: 1, span: 6 }, { start: 7, span: 6 }, { start: 9, span: 8 }]) {
      const shares = resolvePhiGridSlotGapShares(columns);
      const flushStart = ((columns.start - 1) * width) / 24;
      const flushEnd = ((columns.start - 1 + columns.span) * width) / 24;
      expect(flushStart + (gap * shares.lead) / 24)
        .toBeCloseTo(((columns.start - 1) * (width + gap)) / 24);
      expect(flushEnd - (gap * shares.trail) / 24)
        .toBeCloseTo(((columns.start - 1 + columns.span) * (width + gap)) / 24 - gap);
    }
  });
});
