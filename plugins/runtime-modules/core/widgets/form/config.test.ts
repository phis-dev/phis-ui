import { describe, expect, it } from "vitest";

import { PHI_LAYOUT } from "../../../../../theme/phi-tokens";
import { PHI_FORM_WIDGET_DEFINITION, parsePhiFormWidgetConfig } from "./config";

/*
 * The Form's cap, pinned where it is declared.
 *
 * It has been lost twice: once because the parser built a fresh object and dropped the block base an
 * author had set, and once because it was invented in the parser, which the slot frame never reads --
 * the Login Page capped its Form at 480 for a long time and the number did nothing, and every Form a
 * Preset placed rendered uncapped. `defaultConfig` is the one place all three readers reach: the
 * Builder writes it into a node it creates, the Inspector shows it under the node it edits, and the
 * render path merges it under a node that states nothing.
 */
describe("the Form Widget's cap", () => {
  it("is declared as the reading measure", () => {
    expect(PHI_FORM_WIDGET_DEFINITION.defaultConfig.maxSize)
      .toEqual({ width: PHI_LAYOUT.contentMax });
  });

  it("is not invented by the parser", () => {
    // A parser that fills it in answers only the Widget's own render, where nothing reads it. If this
    // starts passing a width again, the value is being written where the frame cannot see it.
    expect(parsePhiFormWidgetConfig({}).maxSize?.width).toBeUndefined();
  });

  it("carries the placement's own geometry through", () => {
    const parsed = parsePhiFormWidgetConfig({ maxSize: { width: "100%" }, minSize: { width: 240 } });

    expect(parsed.maxSize).toEqual({ width: "100%" });
    expect(parsed.minSize).toEqual({ width: 240 });
  });
});

/*
 * The box the placement asks for, pinned as a closed list.
 *
 * Three names are one ladder -- how far the box sets itself off from what is behind it -- and the fourth
 * step is saying nothing at all. That last one carries the weight: a Form in a Split Card slot stands on
 * a ground already, and it is also the only state in which the Form's cap and the width its fields read
 * are the same measure, because every inset sits between the two. So an unknown name and a `card` block
 * an author emptied out both have to land on "no box" rather than on some box nobody chose.
 */
describe("the Form Widget's box", () => {
  it("takes each of the three names", () => {
    for (const presentation of ["card", "panel", "wash"] as const) {
      expect(parsePhiFormWidgetConfig({ card: { presentation } }).card?.presentation)
        .toBe(presentation);
    }
  });

  it("is no box where the name is not one of them", () => {
    expect(parsePhiFormWidgetConfig({ card: { presentation: "plate" } }).card).toBeNull();
  });

  it("is no box where the block was emptied out", () => {
    // Deselecting the box in the Inspector leaves `card` behind with nothing in it, and an empty block
    // is not a box -- which is why the name is read rather than the block's presence.
    expect(parsePhiFormWidgetConfig({ card: {} }).card).toBeNull();
    expect(parsePhiFormWidgetConfig({}).card).toBeNull();
  });
});
