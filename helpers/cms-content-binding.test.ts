import { describe, expect, it } from "vitest";

import { isPhiCmsWidgetContentUnpublished, resolvePhiCmsWidgetContentBindingForConfig } from "./cms-content-binding";

const TEXT_BINDING = { storage: "text", sourceField: "text" } as const;
const MARKDOWN_BINDING = {
  storage: "markdown",
  sourceField: "markdown",
  skipWhenConfigField: "sourceUrl",
} as const;

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
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: {}, resolvedContent: null })).toBe(true);
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: { text: "  " }, resolvedContent: null })).toBe(true);
  });

  it("draws published content, and a preset node's shipped value", () => {
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: {}, resolvedContent: RESOLVED })).toBe(false);
    expect(isPhiCmsWidgetContentUnpublished(TEXT_BINDING, { config: { text: "Preset" }, resolvedContent: null }))
      .toBe(false);
  });

  it("never judges a Widget whose current mode keeps no content", () => {
    expect(resolvePhiCmsWidgetContentBindingForConfig(MARKDOWN_BINDING, { sourceUrl: "https://example.test/a.md" }))
      .toBeNull();
    expect(isPhiCmsWidgetContentUnpublished(MARKDOWN_BINDING, {
      config: { sourceUrl: "https://example.test/a.md" },
      resolvedContent: null,
    })).toBe(false);
    expect(isPhiCmsWidgetContentUnpublished(null, { config: {}, resolvedContent: null })).toBe(false);
  });
});
