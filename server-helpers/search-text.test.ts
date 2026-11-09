import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./translate", () => ({
  trBulkForLocale: vi.fn(async (_locale: string, msgs: string[]) => msgs.map((msg) => (msg ? `de:${msg}` : ""))),
  trGlobalBulkForLocale: vi.fn(async (_locale: string, msgs: string[]) => msgs.map((msg) => (msg ? `global:${msg}` : ""))),
}));

import type { PhiMarkdownBlock } from "../components/widgets/shared/markdown-body-client";
import {
  joinPhiSearchText,
  readPhiHtmlSearchText,
  readPhiMarkdownSearchText,
  translatePhiSearchTexts,
} from "./search-text";

/*
 * What the index is made of: the words a reader sees, one line per block, and nothing else -- no
 * markup, no protected address, no empty line. Translation goes the way the Widget's render goes.
 */
describe("the search text of a Widget", () => {
  it("reads a Markdown document as lines, headings and code included", () => {
    const blocks: PhiMarkdownBlock[] = [
      { kind: "heading", id: "h", level: 2, inlines: [{ kind: "text", text: "Install " }, { kind: "strong", children: [{ kind: "text", text: "phis" }] }] },
      { kind: "paragraph", inlines: [{ kind: "text", text: "Write to " }, { kind: "mail_text", token: "phi-mail:00" }, { kind: "text", text: " today." }] },
      { kind: "list", ordered: false, items: [[{ kind: "paragraph", inlines: [{ kind: "text", text: "One" }] }], [{ kind: "paragraph", inlines: [{ kind: "inline_code", text: "two" }] }]] },
      { kind: "code", language: "sh", tokens: [{ kind: "text", text: "apt install " }, { kind: "text", text: "phis" }] as never },
      { kind: "table", header: [[{ kind: "text", text: "Name" }]], rows: [[[{ kind: "text", text: "Debian" }]]], align: [null] },
      { kind: "divider" },
    ];

    expect(readPhiMarkdownSearchText(blocks)).toEqual([
      "Install phis",
      "Write to today.",
      "One",
      "two",
      "apt install phis",
      "Name",
      "Debian",
    ]);
  });

  it("reads an HTML fragment without its tags, block by block, entities decoded", () => {
    expect(readPhiHtmlSearchText("<h2>Ship &amp; <em>deliver</em></h2><p>Line one<br>line two</p><ul><li>A &#169; B</li></ul>"))
      .toEqual(["Ship & deliver", "Line one", "line two", "A © B"]);
  });

  it("joins lines into one text, collapsed and without empties", () => {
    expect(joinPhiSearchText(["  a  b ", "", null, undefined, "c"])).toBe("a b\nc");
  });

  it("translates through the Site's store, or the platform's for a Preset's words, keeping places", async () => {
    await expect(translatePhiSearchTexts("de", ["Hello", "", "World"], { translate: true })).resolves
      .toEqual(["de:Hello", "", "de:World"]);
    await expect(translatePhiSearchTexts("de", ["Hello"], { translate: true, textSource: "preset" })).resolves
      .toEqual(["global:Hello"]);
    await expect(translatePhiSearchTexts("de", ["Hello"], { translate: false })).resolves.toEqual(["Hello"]);
  });
});
