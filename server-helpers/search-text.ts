import "server-only";

import type { PhiMarkdownBlock, PhiMarkdownInline } from "../components/widgets/shared/markdown-body-client";
import { maskPhiTextPlaceholders, resolvePhiTextPlaceholders } from "../helpers/text-placeholders";
import { PHI_TEXT_SOURCE_PRESET, type PhiTextSource } from "../helpers/text-source";
import type { PhiBlockRuntime } from "../types";
import { trBulkForLocale, trGlobalBulkForLocale } from "./translate";

/**
 * What a Widget's `searchText` is made of (SEARCH.md): the words as a reader sees them, one line per
 * block of text, with nothing a reader does not see.
 *
 * Three answers every text Widget needs: its own words translated the way its render translates them,
 * a rendered Markdown document read back as lines, and an HTML fragment read without its tags. They
 * stand here rather than in each Widget so that the index reads every Widget the same way.
 */

/**
 * The Widget's own words in the reader's language, the way the Widget's render translates them: a
 * Preset's sentence through the platform's store, an author's through the Site's. Empty entries stay
 * in place so the caller can line answers up with what it asked.
 */
export async function translatePhiSearchTexts(
  locale: string,
  texts: readonly (string | undefined | null)[],
  options: { translate: boolean; textSource?: PhiTextSource },
): Promise<string[]> {
  const source = texts.map((text) => (typeof text === "string" ? text.trim() : ""));
  if (!options.translate || !source.some(Boolean)) {
    return source;
  }
  const translated = options.textSource === PHI_TEXT_SOURCE_PRESET
    ? await trGlobalBulkForLocale(locale, source)
    : await trBulkForLocale(locale, source);
  return translated.map((text, index) => text || source[index] || "");
}

/**
 * A Widget's own sentences the way its render shows them: masked, translated, filled -- the order
 * `helpers/text-placeholders.ts` sets out, so `{site.name}` reads as the Site's name in the index as it
 * does on the Page, and never reaches the translator. Empty entries are dropped.
 */
export async function translatePhiSearchWidgetTexts(
  runtime: PhiBlockRuntime,
  texts: readonly (string | undefined | null)[],
  options: { translate: boolean; textSource?: PhiTextSource },
): Promise<string[]> {
  const present = texts.filter((text): text is string => typeof text === "string" && text.trim().length > 0);
  if (present.length === 0) return [];
  const masked = present.map((text) => maskPhiTextPlaceholders(text, 0));
  const translated = await translatePhiSearchTexts(runtime.locale.current, masked.map((entry) => entry.text), options);
  return translated
    .map((text, index) => resolvePhiTextPlaceholders(text, masked[index]!.names, runtime, []))
    .filter(Boolean);
}

function readInlineText(inlines: readonly PhiMarkdownInline[]): string {
  let text = "";
  for (const inline of inlines) {
    switch (inline.kind) {
      case "text":
      case "inline_code":
        text += inline.text;
        break;
      case "strong":
      case "emphasis":
      case "delete":
      case "link":
        text += readInlineText(inline.children);
        break;
      case "image":
        text += inline.alt;
        break;
      case "break":
        text += " ";
        break;
      // A protected address is not written into the index: that is the point of protecting it.
      case "mail_text":
        break;
    }
  }
  return text;
}

/** A rendered Markdown document as lines of text, headings and paragraphs alike, code included. */
export function readPhiMarkdownSearchText(blocks: readonly PhiMarkdownBlock[]): string[] {
  const lines: string[] = [];
  const push = (text: string) => {
    const collapsed = text.replace(/\s+/gu, " ").trim();
    if (collapsed) lines.push(collapsed);
  };
  const walk = (block: PhiMarkdownBlock) => {
    switch (block.kind) {
      case "heading":
      case "paragraph":
        push(readInlineText(block.inlines));
        break;
      case "blockquote":
        block.children.forEach(walk);
        break;
      case "list":
        for (const item of block.items) item.forEach(walk);
        break;
      case "code":
        push(block.tokens.map((token) => token.text).join(""));
        break;
      case "table":
        push(block.header.map(readInlineText).join(" "));
        for (const row of block.rows) push(row.map(readInlineText).join(" "));
        break;
      case "image":
        push(block.image.alt);
        break;
      case "divider":
        break;
    }
  };
  blocks.forEach(walk);
  return lines;
}

const HTML_BLOCK_TAGS = /<\/?(?:p|div|br|li|ul|ol|h[1-6]|tr|td|th|blockquote|pre|section|article|header|footer|figcaption|dd|dt)\b[^>]*>/giu;

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (whole, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return HTML_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

/**
 * An HTML fragment as lines of text: block elements end a line, every other tag is dropped, entities
 * are read. Scripts and styles are gone before this is called -- the fragment is the sanitised one the
 * Widget draws -- so only words remain.
 */
export function readPhiHtmlSearchText(html: string): string[] {
  const withBreaks = html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu, " ")
    .replace(HTML_BLOCK_TAGS, "\n")
    .replace(/<[^>]+>/gu, " ");
  return withBreaks
    .split("\n")
    .map((line) => decodeHtmlEntities(line).replace(/\s+/gu, " ").trim())
    .filter(Boolean);
}

/** The lines a Widget answered, as one text: trimmed, empties dropped, one per line. */
export function joinPhiSearchText(lines: readonly (string | undefined | null)[]): string {
  return lines
    .map((line) => (typeof line === "string" ? line.replace(/\s+/gu, " ").trim() : ""))
    .filter(Boolean)
    .join("\n");
}
