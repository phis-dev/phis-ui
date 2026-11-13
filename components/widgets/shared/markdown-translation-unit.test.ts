import { describe, expect, it, vi } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

import {
  buildMarkdownTranslationUnit,
  readMarkdownTranslationUnit,
  type MarkdownUnitNode,
} from "./markdown-translation-unit";

/*
 * The unit a Markdown paragraph is sent as (TRANSLATIONS.md, "Structured documents"): plain HTML, and
 * everything that is not prose out of the text as a numbered `%n`, read back by number.
 */

function paragraphOf(markdown: string): MarkdownUnitNode[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MarkdownUnitNode;
  return tree.children?.[0]?.children ?? [];
}

function unitOf(markdown: string, options?: Parameters<typeof buildMarkdownTranslationUnit>[1]) {
  return buildMarkdownTranslationUnit(paragraphOf(markdown), options);
}

describe("building a unit", () => {
  it("takes inline code out of the text", () => {
    const unit = unitOf("`GET /api/v1/site/page` reads a Page");
    expect(unit.html).toBe("%1 reads a Page");
    expect(unit.slots).toEqual([{ kind: "code", text: "GET /api/v1/site/page" }]);
  });

  it("keeps two texts that open with different code apart", () => {
    expect(unitOf("`GET /api/v1/site` reads the Site").html).not.toBe(unitOf("`GET /api/v1/site/nav` reads the Navigation").html);
    expect(unitOf("`GET /api/v1/site` reads the Site").html.slice(0, 50))
      .not.toBe(unitOf("`GET /api/v1/site/nav` reads the Navigation").html.slice(0, 50));
  });

  it("writes emphasis as b, i and s, nested as written", () => {
    expect(unitOf("**Storage and _services_.** Then ~~gone~~.").html)
      .toBe("<b>Storage and <i>services</i>.</b> Then <s>gone</s>.");
  });

  it("masks a link's address and numbers it before the text it carries", () => {
    const unit = unitOf("See [the `phis` CLI](./CLI.md) and `site`.");
    expect(unit.html).toBe('See <a href="%1">the %2 CLI</a> and %3.');
    expect(unit.slots).toEqual([
      { kind: "link", href: "./CLI.md" },
      { kind: "code", text: "phis" },
      { kind: "code", text: "site" },
    ]);
  });

  it("leaves a picture in the sentence as a token, its alt text and title beside it", () => {
    const unit = unitOf('A ![three sheets](https://example.org/a.png "Paper") here.');
    expect(unit.html).toBe("A %1 here.");
    expect(unit.slots).toEqual([{ kind: "image", src: "https://example.org/a.png", alt: "three sheets", title: "Paper" }]);
  });

  it("does not send a paragraph that is only a picture or only code", () => {
    expect(unitOf("![alt](https://example.org/a.png)").translatable).toBe(false);
    expect(unitOf("`phis site add`").translatable).toBe(false);
    expect(unitOf("`phis` runs").translatable).toBe(true);
  });

  it("writes a hard break as br", () => {
    expect(unitOf("one  \ntwo").html).toBe("one<br>two");
  });

  it("escapes what HTML needs escaped", () => {
    expect(unitOf("a < b & c > \"d\"").html).toBe("a &lt; b &amp; c &gt; &quot;d&quot;");
  });

  it("masks % and digits written in the prose, so they cannot be taken for a token", () => {
    const unit = unitOf("Use %1 for the name and `x` for the rest");
    expect(unit.html).toBe("Use %1 for the name and %2 for the rest");
    expect(unit.slots).toEqual([{ kind: "literal", text: "%1" }, { kind: "code", text: "x" }]);
    expect(readMarkdownTranslationUnit("Nimm %1 für den Namen und %2 für den Rest", unit.slots)).toEqual([
      { kind: "text", text: "Nimm %1 für den Namen und " },
      { kind: "inline_code", text: "x" },
      { kind: "text", text: " für den Rest" },
    ]);
  });

  it("masks digits right after a token, which would otherwise become part of its number", () => {
    const unit = unitOf("`v`2 times");
    expect(unit.html).toBe("%1%2 times");
    expect(readMarkdownTranslationUnit(unit.html, unit.slots)).toEqual([
      { kind: "inline_code", text: "v" },
      { kind: "text", text: "2 times" },
    ]);
  });

  it("numbers Site placeholders in the same sequence as code, where a producer masks them", () => {
    const unit = unitOf("{site.name} runs `phis` since {year}", { sitePlaceholders: true });
    expect(unit.html).toBe("%1 runs %2 since %3");
    const resolvePlaceholder = vi.fn((name: string) => (name === "year" ? "2026" : "Acme"));
    expect(readMarkdownTranslationUnit("Seit %3 läuft %2 bei %1", unit.slots, { resolvePlaceholder })).toEqual([
      { kind: "text", text: "Seit 2026 läuft " },
      { kind: "inline_code", text: "phis" },
      { kind: "text", text: " bei Acme" },
    ]);
  });

  it("leaves Site placeholders in the text where the producer does not mask them", () => {
    expect(unitOf("{site.name} runs").html).toBe("{site.name} runs");
  });
});

describe("reading a unit back", () => {
  const unit = unitOf("`GET /api/v1/site/page` reads a [Page](/docs/page) **now**.");

  it("restores by number, wherever the provider moved the tokens", () => {
    expect(unit.html).toBe('%1 reads a <a href="%2">Page</a> <b>now</b>.');
    expect(readMarkdownTranslationUnit('<b>Jetzt</b> liest %1 eine <a href="%2">Seite</a>.', unit.slots)).toEqual([
      { kind: "strong", children: [{ kind: "text", text: "Jetzt" }] },
      { kind: "text", text: " liest " },
      { kind: "inline_code", text: "GET /api/v1/site/page" },
      { kind: "text", text: " eine " },
      { kind: "link", href: "/docs/page", external: false, children: [{ kind: "text", text: "Seite" }] },
      { kind: "text", text: "." },
    ]);
  });

  it("takes a link address in single quotes or none, and br in either spelling", () => {
    expect(readMarkdownTranslationUnit("%1 liest <a href='%2'>Seite</a> <b>jetzt</b><br/>.", unit.slots)).not.toBeNull();
    expect(readMarkdownTranslationUnit("%1 liest <a href=%2>Seite</a> <B>jetzt</B><br>.", unit.slots)).not.toBeNull();
  });

  it("decodes entities in the text", () => {
    const plain = unitOf("a & b");
    expect(readMarkdownTranslationUnit("a &amp; b&#39;s &nbsp;", plain.slots)).toEqual([{ kind: "text", text: "a & b's  " }]);
  });

  it("puts a picture back with the alt text it was given", () => {
    const picture = unitOf("A ![sheets](https://example.org/a.png) here.");
    picture.slots[0] = { ...picture.slots[0]!, alt: "Blätter" } as typeof picture.slots[0];
    expect(readMarkdownTranslationUnit("Ein %1 hier.", picture.slots)).toEqual([
      { kind: "text", text: "Ein " },
      { kind: "image", src: "https://example.org/a.png", alt: "Blätter" },
      { kind: "text", text: " hier." },
    ]);
  });

  it.each([
    ["a token missing", 'liest eine <a href="%2">Seite</a> <b>jetzt</b>.'],
    ["a token twice", '%1 liest %1 <a href="%2">Seite</a> <b>jetzt</b>.'],
    ["a token that names nothing", '%1 liest %3 <a href="%2">Seite</a> <b>jetzt</b>.'],
    ["a tag left open", '%1 liest eine <a href="%2">Seite</a> <b>jetzt.'],
    ["tags closed out of turn", '%1 liest <b>eine <a href="%2">Seite</b></a>.'],
    ["a changed link address", '%1 liest eine <a href="%3">Seite</a> <b>jetzt</b>.'],
    ["a real address in place of the token", '%1 liest eine <a href="/docs/page">Seite</a> <b>jetzt</b>. %2'],
    ["a link address used as text", '%1 liest eine %2 <b>jetzt</b>.'],
    ["a code token used as a link address", '%2 liest eine <a href="%1">Seite</a> <b>jetzt</b>.'],
    ["a tag outside the vocabulary", '%1 liest eine <a href="%2">Seite</a> <strong>jetzt</strong>.'],
    ["an attribute on emphasis", '%1 liest eine <a href="%2">Seite</a> <b class="x">jetzt</b>.'],
    ["the old invented markup", '<x-code data-index="0" translate="no">GET</x-code> liest <a href="%2">Seite</a>'],
  ])("rejects an answer with %s", (_case, answer) => {
    expect(readMarkdownTranslationUnit(answer, unit.slots)).toBeNull();
  });
});
