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
