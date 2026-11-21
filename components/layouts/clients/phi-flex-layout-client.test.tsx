import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PhiFlexLayout } from "./phi-flex-layout-client";
import {
  buildPhiSlotChildDataAttributes,
  resolvePhiSlotChildSizingForConfig,
} from "../../../plugins/runtime/slot-size-policy";

/*
 * What the Flex Layout gives each slot on its main axis, read from the markup it renders. A child states
 * its sizing the way a frame does: through the data attributes.
 */
function child(policy: "fill" | "rest" | "intrinsic", config: Record<string, unknown> = {}): ReactNode {
  const sizing = resolvePhiSlotChildSizingForConfig("widget", policy, config);
  return createElement("div", {
    ...buildPhiSlotChildDataAttributes(sizing.policy, {
      explicitInlineSize: sizing.explicitInlineSize,
      explicitBlockSize: sizing.explicitBlockSize,
    }),
  });
}

function slotGrows(vertical: boolean, slots: ReactNode[]) {
  const markup = renderToStaticMarkup(
    createElement(PhiFlexLayout, { layoutKind: vertical ? "verticalflex" : "flex", slots }),
  );
  // A live slot carries no class; its style starts with the flex values, and nothing else in the markup does.
  return [...markup.matchAll(/<div style="flex-grow:(\d+);/gu)].map((match) => Number(match[1]));
}

describe.each([
  ["column", true, { size: { height: 80 } }],
  ["row", false, { size: { width: 80 } }],
] as const)("the Flex %s and a child that takes the rest", (_name, vertical, mainSize) => {
  it("grows the rest child alone beside a filling child", () => {
    expect(slotGrows(vertical, [child("fill"), child("rest")])).toEqual([0, 1]);
  });

  it("shares the room among rest children", () => {
    expect(slotGrows(vertical, [child("rest"), child("rest")])).toEqual([1, 1]);
  });

  it("grows every filling child when none takes the rest", () => {
    expect(slotGrows(vertical, [child("fill"), child("fill")])).toEqual([1, 1]);
  });

  it("does not let a rest child with a stated main size take the rest", () => {
    expect(slotGrows(vertical, [child("rest", mainSize), child("fill")])).toEqual([0, 1]);
  });
});

/** Each slot's shrink and minimum width on a row, read from the style the Layout gives it. */
function rowSlotShrink(slots: ReactNode[], props: Record<string, unknown> = {}) {
  const markup = renderToStaticMarkup(createElement(PhiFlexLayout, { layoutKind: "flex", slots, ...props }));
  return [...markup.matchAll(/<div style="flex-grow:\d+;flex-shrink:(\d+);[^"]*?min-width:([^;"]+)/gu)]
    .map((match) => `${match[1]} ${match[2]}`);
}

/*
 * A row that does not wrap and a child that is its content: a long title beside a small picture. Held at
 * its content size, the title ran past a phone's edge; it gives way now, down to what its content can be,
 * which leaves a picture of a set width as it is.
 */
describe("a Flex row that does not wrap and a child that is its content", () => {
  it("lets the child give way, no further than its content", () => {
    expect(rowSlotShrink([child("intrinsic"), child("intrinsic")])).toEqual(["1 auto", "1 auto"]);
  });

  it("keeps a filling child as it was: it grows from nothing and gives way to nothing", () => {
    expect(rowSlotShrink([child("intrinsic"), child("fill")])).toEqual(["1 auto", "1 0"]);
  });

  it("keeps a child with a width of its own at that width", () => {
    expect(rowSlotShrink([child("intrinsic", { size: { width: 34 } })])).toEqual(["0 0"]);
  });

  it("moves a child to the next line of a row that wraps, rather than letting it give way", () => {
    expect(rowSlotShrink([child("intrinsic")], { wrap: true })).toEqual(["0 0"]);
  });

  it("leaves a collapsed slot as narrow as nothing", () => {
    expect(rowSlotShrink([child("intrinsic")], { initialSlotStates: ["collapsed"] })).toEqual(["0 0"]);
  });
});
