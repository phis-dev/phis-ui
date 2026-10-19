import { describe, expect, it, vi } from "vitest";

/*
 * A teaser is the first paragraph, and only the first paragraph is translated: a card under an entry must
 * not pay a provider for the paragraphs nobody is shown. The cut is the parser's -- a fence holding a
 * blank line is one block, not a paragraph break.
 */

vi.mock("server-only", () => ({}));
const trBulk = vi.hoisted(() => vi.fn(async (messages: string[]) => messages.map((message) => `[${message}]`)));
vi.mock("../../../server-helpers/translate", () => ({ trBulk }));

import { resolveMarkdownRenderData } from "./markdown-render";

const DOCUMENT = [
  "# A heading",
  "",
  "```",
  "code",
  "",
  "more code",
  "```",
  "",
  "The first paragraph.",
  "",
  "The second paragraph.",
].join("\n");

describe("resolveMarkdownRenderData extent", () => {
  it("translates only the first paragraph for a teaser", async () => {
    const data = await resolveMarkdownRenderData({ sourceMode: "inline", markdown: DOCUMENT, extent: "first-paragraph" });
    expect(trBulk).toHaveBeenCalledTimes(1);
    expect(trBulk.mock.calls[0]![0]).toEqual(["The first paragraph."]);
    expect("blocks" in data && data.blocks.map((block) => block.kind)).toEqual(["paragraph"]);
  });

  it("translates every block of the whole document", async () => {
    trBulk.mockClear();
    await resolveMarkdownRenderData({ sourceMode: "inline", markdown: DOCUMENT });
    expect(trBulk.mock.calls[0]![0]).toEqual(["A heading", "The first paragraph.", "The second paragraph."]);
  });
});

describe("resolveMarkdownRenderData headingOffset", () => {
  // An entry's text stands under the entry's title, so `#` is a section of it rather than a second title.
  it("moves every heading down by the offset and stops at h5", async () => {
    const data = await resolveMarkdownRenderData({
      sourceMode: "inline",
      markdown: "# One\n\n## Two\n\n##### Five",
      headingOffset: 1,
    });
    const levels = "blocks" in data
      ? data.blocks.flatMap((block) => (block.kind === "heading" ? [block.level] : []))
      : [];
    expect(levels).toEqual([2, 3, 5]);
  });
});
