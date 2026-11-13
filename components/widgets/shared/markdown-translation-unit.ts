import type { PhiMarkdownInline } from "./markdown-body-client";

/**
 * One Markdown translation unit as it travels: plain HTML any provider's HTML mode handles, with what
 * must not be translated taken out of the text as a numbered `%n`. The vocabulary is the table in
 * TRANSLATIONS.md, "The Markdown unit format".
 */

/** The smallest tree the unit is built from: an mdast inline node, as far as a unit reads it. */
export type MarkdownUnitNode = {
  type: string;
  value?: string;
  url?: string;
  alt?: string;
  title?: string;
  children?: MarkdownUnitNode[];
};

/** What one `%n` stands for, at index `n - 1`. */
export type MarkdownUnitSlot =
  | { kind: "code"; text: string }
  | { kind: "link"; href: string }
  /** `alt` and `title` are filled with their translations before the unit is read back. */
  | { kind: "image"; src: string; alt: string; title: string }
  /** `%` and digits the author wrote; masked so a provider cannot confuse it with a token. */
  | { kind: "literal"; text: string }
  /** A Site copy placeholder (`helpers/text-placeholders.ts`), masked in the same sequence. */
  | { kind: "placeholder"; name: string };

export type MarkdownTranslationUnit = {
  /** What is sent: `format: "html"`. */
  html: string;
  slots: MarkdownUnitSlot[];
  /** Whether any text is left once the tokens are out; a unit without any is not sent, only read back. */
  translatable: boolean;
};

export type MarkdownTranslationUnitOptions = {
  /** Mask Site copy placeholders (`{site.name}` …) in the same sequence; the Markdown body masks none. */
  sitePlaceholders?: boolean;
};

const TEXT_TOKEN_PATTERN = /%\d+|\{([A-Za-z][\w.]*)\}/g;

function escapeUnitText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeUnitText(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

/** Builds the unit for one heading, paragraph or table cell from its inline children. */
export function buildMarkdownTranslationUnit(
  nodes: readonly MarkdownUnitNode[] | undefined,
  options: MarkdownTranslationUnitOptions = {},
): MarkdownTranslationUnit {
  const slots: MarkdownUnitSlot[] = [];
  let html = "";
  const token = (slot: MarkdownUnitSlot) => {
    html += `%${slots.push(slot)}`;
  };
  const serializeText = (value: string) => {
    let cursor = 0;
    /*
     * Digits right after a token would read as part of its number -- `%1` and `2 times` are `%12` --
     * so they leave the text as a literal of their own: `%1%2 times`.
     */
    const leading = /%\d+$/.test(html) ? value.match(/^\d+/)?.[0] : undefined;
    if (leading) {
      token({ kind: "literal", text: leading });
      cursor = leading.length;
    }
    for (const match of value.slice(cursor).matchAll(TEXT_TOKEN_PATTERN)) {
      const name = match[1];
      if (name !== undefined && !options.sitePlaceholders) continue;
      const start = cursor + (match.index ?? 0);
      html += escapeUnitText(value.slice(cursor, start));
      token(name !== undefined ? { kind: "placeholder", name } : { kind: "literal", text: match[0] });
      cursor = start + match[0].length;
    }
    html += escapeUnitText(value.slice(cursor));
  };
  const serialize = (children: readonly MarkdownUnitNode[] | undefined) => {
    for (const node of children ?? []) {
      switch (node.type) {
        case "text":
          serializeText(node.value ?? "");
          break;
        case "strong":
          html += "<b>";
          serialize(node.children);
          html += "</b>";
          break;
        case "emphasis":
          html += "<i>";
          serialize(node.children);
          html += "</i>";
          break;
        case "delete":
          html += "<s>";
          serialize(node.children);
          html += "</s>";
          break;
        case "link":
          // The address is numbered before the text it carries, so the numbers read in source order.
          html += `<a href="%${slots.push({ kind: "link", href: node.url?.trim() ?? "" })}">`;
          serialize(node.children);
          html += "</a>";
          break;
        case "image": {
          const src = node.url?.trim() ?? "";
          if (src) token({ kind: "image", src, alt: node.alt ?? "", title: node.title?.trim() ?? "" });
          break;
        }
        case "inlineCode":
          token({ kind: "code", text: node.value ?? "" });
          break;
        case "break":
          html += "<br>";
          break;
        default:
          serialize(node.children);
      }
    }
  };
  serialize(nodes);
  return { html, slots, translatable: hasMarkdownUnitText(html) };
}

/** Whether a unit holds any text once its tags and tokens are out. */
export function hasMarkdownUnitText(html: string) {
  return decodeUnitText(html.replace(/<[^>]*>/g, "").replace(/%\d+/g, "")).trim().length > 0;
}

const UNIT_TOKEN_PATTERN = /<(\/?)([a-z][a-z0-9]*)\b([^>]*)>|%(\d+)/gi;
const HREF_PATTERN = /^\s+href\s*=\s*(?:"%(\d+)"|'%(\d+)'|%(\d+)(?=\s|$))\s*$/i;

type ReadFrame = { tag: "root" | "b" | "i" | "s" | "a"; href?: string; children: PhiMarkdownInline[] };

/**
 * Reads a unit back into inlines, by number and never by order: a provider moves tokens to wherever its
 * language needs them. `null` for anything outside the vocabulary -- an unknown tag or attribute, a tag
 * left open or closed out of turn, a slot missing, doubled or used as the wrong kind; the caller then
 * shows the source.
 */
export function readMarkdownTranslationUnit(
  html: string,
  slots: readonly MarkdownUnitSlot[],
  options: { resolvePlaceholder?: (name: string) => string } = {},
): PhiMarkdownInline[] | null {
  const stack: ReadFrame[] = [{ tag: "root", children: [] }];
  const used = new Set<number>();
  const take = (digits: string | undefined) => {
    const number = Number(digits);
    const slot = slots[number - 1];
    if (!slot || used.has(number)) return null;
    used.add(number);
    return slot;
  };
  const appendText = (text: string) => {
    if (!text) return;
    const children = stack.at(-1)!.children;
    const last = children.at(-1);
    if (last?.kind === "text") last.text += text;
    else children.push({ kind: "text", text });
  };
  const appendRaw = (raw: string) => {
    // A `<` that opened no tag the pattern knows is markup this vocabulary does not have.
    if (/<[a-z/!?]/i.test(raw)) return false;
    appendText(decodeUnitText(raw));
    return true;
  };

  let cursor = 0;
  for (const match of html.matchAll(UNIT_TOKEN_PATTERN)) {
    if (!appendRaw(html.slice(cursor, match.index))) return null;
    cursor = (match.index ?? 0) + match[0].length;
    const [, closing, rawTag, attributes, digits] = match;
    if (digits !== undefined) {
      const slot = take(digits);
      if (!slot || slot.kind === "link") return null;
      const children = stack.at(-1)!.children;
      if (slot.kind === "code") children.push({ kind: "inline_code", text: slot.text });
      else if (slot.kind === "image") {
        children.push({ kind: "image", src: slot.src, alt: slot.alt, ...(slot.title ? { title: slot.title } : {}) });
      } else if (slot.kind === "literal") appendText(slot.text);
      else appendText(options.resolvePlaceholder?.(slot.name) ?? `{${slot.name}}`);
      continue;
    }
    const tag = rawTag!.toLowerCase();
    if (tag === "br") {
      if (closing || !/^\s*\/?\s*$/.test(attributes ?? "")) return null;
      stack.at(-1)!.children.push({ kind: "break" });
      continue;
    }
    if (tag !== "b" && tag !== "i" && tag !== "s" && tag !== "a") return null;
    if (closing) {
      const frame = stack.pop();
      const parent = stack.at(-1);
      if (!frame || !parent || frame.tag !== tag || (attributes ?? "").trim()) return null;
      if (frame.tag === "a") {
        parent.children.push({
          kind: "link",
          href: frame.href!,
          external: /^https?:\/\//.test(frame.href!),
          children: frame.children,
        });
      } else {
        parent.children.push({
          kind: frame.tag === "b" ? "strong" : frame.tag === "i" ? "emphasis" : "delete",
          children: frame.children,
        });
      }
      continue;
    }
    if (tag === "a") {
      const href = (attributes ?? "").match(HREF_PATTERN);
      const slot = href ? take(href[1] ?? href[2] ?? href[3]) : null;
      if (slot?.kind !== "link") return null;
      stack.push({ tag, href: slot.href, children: [] });
      continue;
    }
    if ((attributes ?? "").trim()) return null;
    stack.push({ tag, children: [] });
  }
  if (!appendRaw(html.slice(cursor))) return null;
  if (stack.length !== 1 || used.size !== slots.length) return null;
  return stack[0]!.children;
}
