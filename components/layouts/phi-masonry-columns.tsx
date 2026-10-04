"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

import { packPhiMasonryItems } from "./phi-masonry-contract";

const PHI_MASONRY_ITEM_SELECTOR = ":scope > .phi-masonry-layout__item";

/** Packs the column box's children, or hands them back to the flow where there is one column. */
function packPhiMasonryBox(box: HTMLElement) {
  const items = [...box.querySelectorAll<HTMLElement>(PHI_MASONRY_ITEM_SELECTOR)];
  const columns = Number.parseInt(getComputedStyle(box).getPropertyValue("--phi-masonry-columns"), 10);

  if (!Number.isFinite(columns) || columns <= 1 || items.length === 0) {
    box.removeAttribute("data-phi-masonry-packed");
    box.style.removeProperty("--phi-masonry-packed-columns");
    box.style.removeProperty("--phi-masonry-packed-height");
    for (const item of items) {
      item.style.removeProperty("--phi-masonry-item-column");
      item.style.removeProperty("--phi-masonry-item-top");
    }
    return;
  }

  /*
   * The count goes on first, so the heights are measured at the width the children have with it -- the
   * width of a column of the flow, too, so the first pack measures what the flow showed.
   */
  box.setAttribute("data-phi-masonry-packed", "");
  box.style.setProperty("--phi-masonry-packed-columns", String(columns));
  const heights = items.map((item) => item.getBoundingClientRect().height);
  const { placements, height } = packPhiMasonryItems(heights, columns);
  items.forEach((item, index) => {
    item.style.setProperty("--phi-masonry-item-column", String(placements[index].column));
    item.style.setProperty("--phi-masonry-item-top", `${placements[index].top}px`);
  });
  box.style.setProperty("--phi-masonry-packed-height", `${height}px`);
}

/**
 * A Masonry's column box, packed by height once the browser can measure.
 *
 * The server sends the children in a multi-column flow, which balances where the columns end and so
 * leaves a column empty whenever fewer would end lower: four children of one height in three columns
 * stood two and two. Here each child is measured and set under the column that ends highest
 * (`packPhiMasonryItems`), so every column the author asked for is used.
 *
 * Nothing is moved in the DOM -- a Widget moved to another parent would mount anew -- the children are
 * only placed: the column and the top go on each item as custom properties, and
 * `[data-phi-masonry-packed]` in `styles/layout.css` turns the flow off and places them. The column
 * count is read from the box, where the container queries chose it, so the thresholds stay in the
 * stylesheet. One column needs no packing; the flow is the packing then.
 */
export function PhiMasonryColumns({ children }: { children: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  /* Box width (and with it the count) and every child's height; a pack that changes nothing settles. */
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => packPhiMasonryBox(box));
    observerRef.current = observer;
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);

  /* After every render: the children may have changed, so observe the ones there are and pack. */
  useLayoutEffect(() => {
    const box = boxRef.current;
    const observer = observerRef.current;
    if (!box || !observer) return;
    observer.disconnect();
    observer.observe(box);
    for (const item of box.querySelectorAll<HTMLElement>(PHI_MASONRY_ITEM_SELECTOR)) {
      observer.observe(item);
    }
    packPhiMasonryBox(box);
  });

  return (
    <div ref={boxRef} className="phi-masonry-layout__columns">
      {children}
    </div>
  );
}
