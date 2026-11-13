import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * What a translated Markdown document asks for and what it draws from the answer: the units in the
 * format of `markdown-translation-unit.ts`, picture texts as plain text of their own, and the source
 * wherever an answer does not read back.
 */

vi.mock("server-only", () => ({}));
const answers = vi.hoisted(() => new Map<string, string>());
const trBulk = vi.hoisted(() => vi.fn(async (messages: string[], _ctx?: unknown, _format?: string) =>
  messages.map((message) => answers.get(message) ?? message)));
vi.mock("../../../server-helpers/translate", () => ({ trBulk }));

import { resolveMarkdownRenderData } from "./markdown-render";

async function render(markdown: string) {
  const data = await resolveMarkdownRenderData({ sourceMode: "inline", markdown });
  if ("error" in data) throw new Error(data.error);
  return data.blocks;
}

beforeEach(() => {
  answers.clear();
  trBulk.mockClear();
});

describe("a translated Markdown document", () => {
  it("sends each list item as plain HTML with its code out of the text", async () => {
    await render("- `GET /api/v1/site` reads the Site\n- `GET /api/v1/site/page` reads a **Page**");
    expect(trBulk.mock.calls[0]![0]).toEqual(["%1 reads the Site", "%1 reads a <b>Page</b>"]);
    expect(trBulk.mock.calls[0]![2]).toBe("html");
  });

  it("draws the answer by number, wherever the provider moved the tokens", async () => {
    answers.set('%1 reads a <a href="%2">Page</a>', '<a href="%2">Eine Seite</a> liest %1');
    const [paragraph] = await render("`GET /api/v1/site/page` reads a [Page](https://example.org/page)");
    expect(paragraph).toEqual({
      kind: "paragraph",
      inlines: [
        { kind: "link", href: "https://example.org/page", external: true, children: [{ kind: "text", text: "Eine Seite" }] },
        { kind: "text", text: " liest " },
        { kind: "inline_code", text: "GET /api/v1/site/page" },
      ],
    });
  });

  it("shows the source where an answer does not read back", async () => {
    answers.set('%1 reads a <a href="%2">Page</a>', '%1 liest eine <a href="%3">Seite</a>');
    const [paragraph] = await render("`GET` reads a [Page](https://example.org/page)");
    expect(JSON.stringify(paragraph)).toContain('"text":" reads a "');
  });

  it("translates a picture's alt text and title as plain text of their own", async () => {
    answers.set("Three sheets", "Drei Blätter");
    answers.set("Paper", "Papier");
    const [paragraph] = await render('![Three sheets](https://example.org/a.png "Paper")');
    // Nothing else is left to translate in the paragraph, so only the picture's texts are asked for.
    expect(trBulk).toHaveBeenCalledTimes(1);
    expect(trBulk.mock.calls[0]![0]).toEqual(["Three sheets", "Paper"]);
    expect(trBulk.mock.calls[0]![2]).toBe("text");
    expect(paragraph).toEqual({
      kind: "paragraph",
      inlines: [{ kind: "image", src: "https://example.org/a.png", alt: "Drei Blätter", title: "Papier" }],
    });
  });
});
