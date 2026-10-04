import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PHI_MASONRY_LAYOUT_DEFAULT_COLUMNS,
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
