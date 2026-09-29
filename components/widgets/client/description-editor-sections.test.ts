import { describe, expect, it } from "vitest";

import { resolvePhiDescriptionEditorSections } from "./description-editor-sections";

const EMPTY = { eyebrow: "", title: "", description: "", asideTitle: "", asideItems: [] };

describe("the Description editor's sections", () => {
  it("offers an editing author every part of an empty block", () => {
    expect(resolvePhiDescriptionEditorSections(EMPTY, true)).toEqual({
      eyebrowTag: false,
      heading: true,
      aside: true,
    });
  });

  it("shows a visitor only the parts that have text", () => {
    expect(resolvePhiDescriptionEditorSections(EMPTY, false)).toEqual({
      eyebrowTag: false,
      heading: false,
      aside: false,
    });
    expect(resolvePhiDescriptionEditorSections({ ...EMPTY, description: "Text" }, false).heading)
      .toBe(true);
    expect(resolvePhiDescriptionEditorSections({ ...EMPTY, asideItems: ["One"] }, false).aside)
      .toBe(true);
  });

  it("puts the eyebrow in its pill from the stored text, in both modes", () => {
    const stored = { ...EMPTY, eyebrow: "New" };
    expect(resolvePhiDescriptionEditorSections(stored, true).eyebrowTag).toBe(true);
    expect(resolvePhiDescriptionEditorSections(stored, false).eyebrowTag).toBe(true);
  });
});
