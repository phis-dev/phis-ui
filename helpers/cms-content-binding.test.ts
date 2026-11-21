import { describe, expect, it } from "vitest";

import { isPhiCmsWidgetContentUnpublished, resolvePhiCmsWidgetContentBindingForConfig } from "./cms-content-binding";

const TEXT_BINDING = { storage: "text", sourceField: "text" } as const;
const MARKDOWN_BINDING = {
  storage: "markdown",
  sourceField: "markdown",
  skipWhenConfigField: "sourceUrl",
} as const;

const RECORD_MARKDOWN_BINDING = { ...MARKDOWN_BINDING, recordField: "recordField" } as const;
const NO_RECORD = { aboutRecord: false };
const ABOUT_RECORD = { aboutRecord: true };

const RESOLVED = {
  id: 1,
  type: 5,
  slug: "x",
  versionId: 2,
  assetId: null,
  status: 1,
  meta: {},
  textFields: { text: { msgId: 3, source: "Hallo", value: "Hallo" } },
};

/** What the live Site leaves out: bound content that was never published (phis-server CONTENT.md). */
describe("bound Widget content on the live Site", () => {
  it("leaves out a bound Widget with neither published content nor a value of its own", () => {
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: {}, resolvedContent: null }, NO_RECORD)).toBe(true);
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: { text: "  " }, resolvedContent: null }, NO_RECORD)).toBe(true);
  });

  it("draws published content, and a preset node's shipped value", () => {
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: {}, resolvedContent: RESOLVED }, NO_RECORD)).toBe(false);
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: { text: "Preset" }, resolvedContent: null }, NO_RECORD))
      .toBe(false);
  });

  it("never judges a Widget whose current mode keeps no content", () => {
    expect(resolvePhiCmsWidgetContentBindingForConfig(MARKDOWN_BINDING, { sourceUrl: "https://example.test/a.md" }))
      .toBeNull();
    expect(isPhiCmsWidgetContentUnpublished(MARKDOWN_BINDING, {
      config: { sourceUrl: "https://example.test/a.md" },
      resolvedContent: null,
    }, NO_RECORD)).toBe(false);
    expect(isPhiCmsWidgetContentUnpublished(null, { config: {}, resolvedContent: null }, NO_RECORD)).toBe(false);
  });

  it("never judges a Widget showing a field of the page record, on a Page about a record", () => {
    // The product page's description: an empty text of its own, the record's description in its place.
    const template = { config: { markdown: "", recordField: "description" }, resolvedContent: null };
    expect(isPhiCmsWidgetContentUnpublished(RECORD_MARKDOWN_BINDING, template, ABOUT_RECORD)).toBe(false);
  });

  it("judges the same Widget by its own content where the Page is about no record, or it names no field", () => {
    const template = { config: { markdown: "", recordField: "description" }, resolvedContent: null };
    expect(isPhiCmsWidgetContentUnpublished(RECORD_MARKDOWN_BINDING, template, NO_RECORD)).toBe(true);
    expect(isPhiCmsWidgetContentUnpublished(RECORD_MARKDOWN_BINDING, {
      config: { markdown: "", recordField: "" },
      resolvedContent: null,
    }, ABOUT_RECORD)).toBe(true);
    // A Widget that declares no record field is judged as before, record or not.
    expect(isPhiCmsWidgetContentUnpublished(MARKDOWN_BINDING, template, ABOUT_RECORD)).toBe(true);
  });
});
