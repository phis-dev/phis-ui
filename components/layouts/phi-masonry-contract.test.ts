import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS,
  packPhiMasonryItems,
  resolvePhiMasonryColumnProperties,
  resolvePhiMasonryColumns,
} from "./phi-masonry-contract";
import { PhiMasonryLayout } from "./phi-masonry-layout";

/*
 * A Masonry answers the room the way a Grid does: a column count for every width, picked by its own
 * width. One number for all widths, or a minimum width that silently replaced the count, stood here.
 */
describe("a Masonry's columns", () => {
  it("defaults to one, two and three", () => {
    expect(resolvePhiMasonryColumns(undefined)).toEqual(PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS);
    expect(PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS).toEqual({ compact: 1, medium: 2, wide: 3 });
  });

  it("takes what was stated where it is a column count, and the default elsewhere", () => {
    expect(resolvePhiMasonryColumns({ medium: 4, wide: 5 })).toEqual({ compact: 1, medium: 4, wide: 3 });
  });

  it("writes the count for every width and the gap as custom properties", () => {
    expect(resolvePhiMasonryColumnProperties({ compact: 1, medium: 2, wide: 4 }, "8px")).toEqual({
      "--phi-masonry-gap": "8px",
      "--phi-masonry-columns-compact": "1",
      "--phi-masonry-columns-medium": "2",
      "--phi-masonry-columns-wide": "4",
    });
  });

  it("stands its columns in a box inside the container they are asked of", () => {
    const markup = renderToStaticMarkup(createElement(PhiMasonryLayout, {
      slots: [createElement("p", { key: "a" }, "a"), null, createElement("p", { key: "b" }, "b")],
      columns: { wide: 4 },
      gap: 8,
    }));
    expect(markup).toMatch(/container-type:inline-size;container-name:phi-masonry/u);
    expect(markup).toMatch(/--phi-masonry-columns-wide:4/u);
    expect(markup).toMatch(/--phi-masonry-gap:8px/u);
    expect(markup.match(/class="phi-masonry-layout__columns"/gu)).toHaveLength(1);
    expect(markup.match(/class="phi-masonry-layout__item"/gu)).toHaveLength(2);
  });
});

/*
 * The browser's multi-column flow balances where the columns end and leaves a column empty when fewer
 * end lower: four children of one height in three columns stood two and two. Packing by height uses
 * every column it is given.
 */
describe("packing a Masonry by height", () => {
  it("uses every column for children of one height", () => {
    const { placements, height } = packPhiMasonryItems([80, 80, 80, 80], 3);
    expect(placements.map((placement) => placement.column)).toEqual([0, 1, 2, 0]);
    expect(placements[3].top).toBe(80);
    expect(height).toBe(160);
  });

  it("sets each child under the column that ends highest, the leftmost on a tie", () => {
    const { placements, height } = packPhiMasonryItems([100, 40, 60, 30, 50], 2);
    expect(placements).toEqual([
      { column: 0, top: 0 },
      { column: 1, top: 0 },
      { column: 1, top: 40 },
      { column: 0, top: 100 },
      { column: 1, top: 100 },
    ]);
    expect(height).toBe(150);
  });

  it("takes half a pixel for a tie, so measured fractions keep to the left", () => {
    const { placements } = packPhiMasonryItems([50.3, 50, 10], 2);
    expect(placements[2].column).toBe(0);
  });
});
