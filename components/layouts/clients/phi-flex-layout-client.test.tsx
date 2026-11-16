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
function child(policy: "fill" | "rest", config: Record<string, unknown> = {}): ReactNode {
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
