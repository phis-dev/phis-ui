import { describe, expect, it } from "vitest";

import { isPhiInspectorTranslateSwitchShown, resolvePhiInspectorTranslateSwitchIndex } from "./inspector-translate-switch";

describe("the Inspector's Translate text switch", () => {
  it("is offered for a node that translates its own words", () => {
    expect(isPhiInspectorTranslateSwitchShown({ translatesOwnText: true }, { text: "Hello" })).toBe(true);
    expect(isPhiInspectorTranslateSwitchShown({ translatesOwnText: true }, { recordField: "  " })).toBe(true);
  });

  it("is not offered while the node shows a field of the page record", () => {
    expect(isPhiInspectorTranslateSwitchShown({ translatesOwnText: true }, { recordField: "summary" })).toBe(false);
  });

  it("is not offered for a node whose words the renderer translates", () => {
    expect(isPhiInspectorTranslateSwitchShown({}, {})).toBe(false);
    expect(isPhiInspectorTranslateSwitchShown(null, null)).toBe(false);
  });
});

describe("where the Translate text switch stands", () => {
  it("right after the field that binds the words to the page record", () => {
    expect(resolvePhiInspectorTranslateSwitchIndex([
      { key: "recordField", heading: "Text" },
      { key: "tone" },
      { key: "linkTarget", heading: "Link target" },
    ])).toBe(1);
  });

  it("without one, closing the Widget's own fields before the next headed group", () => {
    expect(resolvePhiInspectorTranslateSwitchIndex([{ key: "title" }, { key: "tone" }, { key: "badge", heading: "Badge" }])).toBe(2);
    expect(resolvePhiInspectorTranslateSwitchIndex([{ key: "title", heading: "Text" }, { key: "tone" }])).toBe(2);
  });
});
