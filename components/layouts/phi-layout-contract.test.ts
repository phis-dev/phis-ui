import { describe, expect, it } from "vitest";

import {
  PHI_SLOT_BLOCK_MARGIN_END_PROPERTY,
  PHI_SLOT_BLOCK_MARGIN_START_PROPERTY,
  PHI_SLOT_INLINE_MARGIN_END_PROPERTY,
  PHI_SLOT_INLINE_MARGIN_START_PROPERTY,
  PHI_SLOT_BLOCK_PLACEMENT_MARGIN_STYLE,
  PHI_SLOT_INLINE_PLACEMENT_MARGIN_STYLE,
  expandPhiPaddingShorthand,
  phiFlexPlacementWord,
  phiGridPlacementWord,
  resolvePhiLayoutInset,
  resolvePhiPaddingStyle,
  resolvePhiPlacement,
  resolvePhiSlotPlacementMargins,
} from "./phi-layout-contract";

/*
 * One reading of the anchor, in both spellings it arrives in.
 *
 * Four Layouts wrote their own ladder of the nine placements, and the one thing they disagreed on was
 * what an unstated axis means: two of them answered `center`, which is not the same as saying nothing.
 */
describe("where an anchor puts a child", () => {
  it("reads all nine placements on both axes", () => {
    expect(resolvePhiPlacement("topLeft")).toEqual({ inline: "start", block: "start" });
    expect(resolvePhiPlacement("bottom")).toEqual({ inline: "center", block: "end" });
    expect(resolvePhiPlacement("right")).toEqual({ inline: "end", block: "center" });
  });

  it("keeps an axis nobody stated apart from the middle", () => {
    expect(resolvePhiPlacement({ horizontal: "left" })).toEqual({ inline: "start", block: null });
    expect(resolvePhiPlacement({ vertical: "bottom" })).toEqual({ inline: null, block: "end" });
    expect(resolvePhiPlacement({})).toEqual({ inline: null, block: null });
    expect(resolvePhiPlacement(null)).toEqual({ inline: null, block: null });
  });

  it("mirrors the inline axis for a slot that reads the anchor from the other side", () => {
    expect(resolvePhiPlacement("topLeft", "mirrorInline")).toEqual({ inline: "end", block: "start" });
    expect(resolvePhiPlacement("center", "mirrorInline")).toEqual({ inline: "center", block: "center" });
    expect(resolvePhiPlacement({ vertical: "top" }, "mirrorInline")).toEqual({ inline: null, block: "start" });
  });

  it("pins the inline axis for a slot that does not listen to the anchor", () => {
    expect(resolvePhiPlacement("bottomRight", "pinInlineStart")).toEqual({ inline: "start", block: "end" });
    expect(resolvePhiPlacement("topLeft", "pinInlineEnd")).toEqual({ inline: "end", block: "start" });
  });
});

describe("how a placement is spelled", () => {
  it("writes flex words and leaves an unstated axis to the caller", () => {
    expect(phiFlexPlacementWord("start")).toBe("flex-start");
    expect(phiFlexPlacementWord("center")).toBe("center");
    expect(phiFlexPlacementWord("end")).toBe("flex-end");
    expect(phiFlexPlacementWord(null)).toBeUndefined();
  });

  it("writes grid words and leaves an unstated axis to the caller", () => {
    expect(phiGridPlacementWord("start")).toBe("start");
    expect(phiGridPlacementWord("end")).toBe("end");
    expect(phiGridPlacementWord(null)).toBeUndefined();
  });
});

/*
 * The margins are how a child that was stretched is still placed: `auto` is not a distance but the
 * instruction to give the leftover room to that side, and a child that fills edge to edge has none.
 */
describe("the margins a slot hands down", () => {
  it("gives both sides the room for a centred axis and one side for an end", () => {
    expect(resolvePhiSlotPlacementMargins({ inline: "center", block: null })).toEqual({
      [PHI_SLOT_INLINE_MARGIN_START_PROPERTY]: "auto",
      [PHI_SLOT_INLINE_MARGIN_END_PROPERTY]: "auto",
      [PHI_SLOT_BLOCK_MARGIN_START_PROPERTY]: "0",
      [PHI_SLOT_BLOCK_MARGIN_END_PROPERTY]: "0",
    });
    expect(resolvePhiSlotPlacementMargins({ inline: "end", block: "end" })).toEqual({
      [PHI_SLOT_INLINE_MARGIN_START_PROPERTY]: "auto",
      [PHI_SLOT_INLINE_MARGIN_END_PROPERTY]: "0",
      [PHI_SLOT_BLOCK_MARGIN_START_PROPERTY]: "auto",
      [PHI_SLOT_BLOCK_MARGIN_END_PROPERTY]: "0",
    });
  });

  it("states a zero for an axis that starts and for one nobody stated, so nothing is inherited", () => {
    expect(resolvePhiSlotPlacementMargins({ inline: "start", block: null })).toEqual({
      [PHI_SLOT_INLINE_MARGIN_START_PROPERTY]: "0",
      [PHI_SLOT_INLINE_MARGIN_END_PROPERTY]: "0",
      [PHI_SLOT_BLOCK_MARGIN_START_PROPERTY]: "0",
      [PHI_SLOT_BLOCK_MARGIN_END_PROPERTY]: "0",
    });
  });
});

/*
 * And what a box reads back is the same four names, each with its fallback.
 *
 * The pairing is the whole mechanism, and both halves of it fail in the same silent direction. A slot
 * that writes a property nobody reads places nothing; a box that reads a name nobody writes takes the
 * fallback and stands where it always stood. Either way the anchor looks as though it did nothing, which
 * is the finding that has come back twice -- once for the block axis, which had no properties at all,
 * and once for the Form, whose cap sits one box inside the frame that was reading them.
 */
describe("the margins a box reads back", () => {
  it("reads every property the slot writes, and falls back to no margin at all", () => {
    const written = Object.keys(resolvePhiSlotPlacementMargins({ inline: "center", block: "center" }));
    const read = Object.values({
      ...PHI_SLOT_INLINE_PLACEMENT_MARGIN_STYLE,
      ...PHI_SLOT_BLOCK_PLACEMENT_MARGIN_STYLE,
    });

    expect(read).toHaveLength(written.length);
    for (const property of written) {
      expect(read).toContain(`var(${property}, 0)`);
    }
  });
});

/*
 * A padding shorthand is read the way CSS reads it. Copying `8px 16px` into every longhand gave four
 * values the browser drops.
 */
describe("how a padding shorthand reaches the four sides", () => {
  it("mirrors one to four values in CSS order", () => {
    expect(expandPhiPaddingShorthand(8)).toEqual({
      top: "8px",
      right: "8px",
      bottom: "8px",
      left: "8px",
    });
    expect(expandPhiPaddingShorthand("8px 16px")).toEqual({
      top: "8px",
      right: "16px",
      bottom: "8px",
      left: "16px",
    });
    expect(expandPhiPaddingShorthand("1px 2px 3px")).toEqual({
      top: "1px",
      right: "2px",
      bottom: "3px",
      left: "2px",
    });
    expect(expandPhiPaddingShorthand("1px 2px 3px 4px")).toEqual({
      top: "1px",
      right: "2px",
      bottom: "3px",
      left: "4px",
    });
  });

  it("keeps whitespace inside functions as one value", () => {
    expect(expandPhiPaddingShorthand("calc(1px + 2px) var(--gap, 4px)")).toEqual({
      top: "calc(1px + 2px)",
      right: "var(--gap, 4px)",
      bottom: "calc(1px + 2px)",
      left: "var(--gap, 4px)",
    });
  });

  it("refuses more than four values", () => {
    expect(() => expandPhiPaddingShorthand("1px 2px 3px 4px 5px")).toThrow(/at most four/);
  });

  it("lets a side field override its side of the shorthand", () => {
    expect(resolvePhiPaddingStyle({ padding: "8px 16px", paddingTop: 2 })).toEqual({
      paddingTop: "2px",
      paddingRight: "16px",
      paddingBottom: "8px",
      paddingLeft: "16px",
    });
    expect(resolvePhiLayoutInset({ padding: "8px 16px" })).toEqual({
      top: "8px",
      right: "16px",
      bottom: "8px",
      left: "16px",
    });
  });
});
