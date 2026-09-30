import { describe, expect, it } from "vitest";

import { PHI_LAYOUT } from "../../../../../theme/phi-tokens";
import { PHI_FORM_WIDGET_DEFINITION, parsePhiFormWidgetConfig } from "./config";

/*
 * The Form's cap, pinned where it is declared and pinned as the fields' measure.
 *
 * It has been lost twice and then mismeasured once. Lost, because the parser built a fresh object and
 * dropped the block base an author had set, and because it was invented in the parser, which the slot
 * frame never reads -- the Login Page capped its Form at 480 for a long time and the number did nothing.
 * Mismeasured, because a block cap is drawn on the outermost element and every box the Widget puts
 * inside it eats the cap: a Form capped at 610 in a `card` gave its fields 568, which is also what
 * their container query read, one step below the threshold the cap was picked to land on.
 *
 * So the cap is the Form's own field now, and `defaultConfig` is still the place: it is the one
 * declaration all three readers reach -- the Builder writes it into a node it creates, the Inspector
 * shows it under the node it edits, and the render path merges it under a node that states nothing.
 * What must not come back is the block `maxSize`, which would cap the box again and take the inset off
 * the fields a second time.
 */
describe("the Form Widget's cap", () => {
  it("is declared as the reading measure", () => {
    expect(PHI_FORM_WIDGET_DEFINITION.defaultConfig.maxFormWidth).toBe(PHI_LAYOUT.contentMax);
  });

  it("is not stated as the block's geometry", () => {
    // The box around the fields is inside the block, so a block cap is a cap on box plus inset. If this
    // starts failing, the fields are reading less than the number says and `wide` is out of reach again.
    expect(PHI_FORM_WIDGET_DEFINITION.defaultConfig).not.toHaveProperty("maxSize");
  });

  it("is answered by the parser as well, for the placement that states nothing", () => {
    // Only a Widget's block base is merged under a node at render, so a Widget field that only
    // `defaultConfig` states reaches the Builder and the Inspector and no Preset placement at all.
    expect(parsePhiFormWidgetConfig({}).maxFormWidth).toBe(PHI_LAYOUT.contentMax);
  });

  it("carries the placement's own measure through", () => {
    expect(parsePhiFormWidgetConfig({ maxFormWidth: 377 }).maxFormWidth).toBe(377);
    expect(parsePhiFormWidgetConfig({ maxFormWidth: "100%" }).maxFormWidth).toBe("100%");
    expect(parsePhiFormWidgetConfig({ maxFormWidth: " 40rem " }).maxFormWidth).toBe("40rem");
  });

  it("refuses a cap that cannot be one", () => {
    // `0` capped the fields at nothing and a bare `"610"` became `min(100%, 610)`, which the browser
    // drops: both rendered something other than what was written, without an error.
    expect(() => parsePhiFormWidgetConfig({ maxFormWidth: 0 })).toThrow(/positive number/);
    expect(() => parsePhiFormWidgetConfig({ maxFormWidth: -10 })).toThrow(/positive number/);
    expect(() => parsePhiFormWidgetConfig({ maxFormWidth: "610" })).toThrow(/needs a unit/);
    expect(() => parsePhiFormWidgetConfig({ maxFormWidth: "0px" })).toThrow(/positive length/);
    expect(() => parsePhiFormWidgetConfig({ maxFormWidth: true })).toThrow(/number or a length/);
  });

  it("leaves an emptied cap to the house measure", () => {
    expect(parsePhiFormWidgetConfig({ maxFormWidth: "" }).maxFormWidth).toBe(PHI_LAYOUT.contentMax);
    expect(parsePhiFormWidgetConfig({ maxFormWidth: null }).maxFormWidth).toBe(PHI_LAYOUT.contentMax);
  });

  it("carries the placement's own geometry through as well", () => {
    // Two boxes, both cappable: the block is the slot frame's, the form is this Widget's.
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
