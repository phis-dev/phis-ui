import { describe, expect, it } from "vitest";

import {
  PHI_GRID_LAYOUT_DEFAULT_SPAN,
  resolvePhiGridSlotColumnProperties,
  resolvePhiGridSlotColumns,
  resolvePhiGridSlotGapShares,
  resolvePhiGridSlotProfileColumns,
} from "./phi-grid-contract";

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

/*
 * Every width's answer goes into the markup and a container query picks one, so the server's markup
 * stands where it stays rather than at `compact` until a measurement after hydration.
 */
describe("the columns a slot carries for every width", () => {
  it("answers each profile with its own default span", () => {
    const columns = resolvePhiGridSlotProfileColumns(undefined, [0, 1]);
    expect(columns.get(1)).toEqual({
      compact: { start: 1, span: 24 },
      medium: { start: 13, span: 12 },
      wide: { start: 7, span: 6 },
    });
  });

  it("writes the three answers as the custom properties the stylesheet reads", () => {
    const columns = resolvePhiGridSlotProfileColumns(
      [{ slotIndex: 0, span: { compact: 24, wide: 8 } }],
      [0],
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
