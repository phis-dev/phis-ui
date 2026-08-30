import "server-only";

import renderHtml from "dom-serializer";
import { parseDocument } from "htmlparser2";

import { trBulk } from "../../../server-helpers/translate";
import { sanitizePhiHtmlWidgetMarkup } from "./html-content";

type HtmlNode = {
  type: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: HtmlNode[];
  parent?: HtmlNode | null;
};

const SEMANTIC_HTML_BLOCKS = new Set([
  "p",
  "div",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "blockquote",
  "td",
  "th",
]);

function isElement(node: HtmlNode) {
  return node.type === "tag" || node.type === "script" || node.type === "style";
}

function hasSemanticDescendant(node: HtmlNode): boolean {
  return (node.children ?? []).some((child) =>
    (isElement(child) && SEMANTIC_HTML_BLOCKS.has(child.name?.toLowerCase() ?? "")) ||
    hasSemanticDescendant(child));
}

function collectSemanticBlocks(node: HtmlNode, result: HtmlNode[]) {
  if (
    isElement(node) &&
    SEMANTIC_HTML_BLOCKS.has(node.name?.toLowerCase() ?? "") &&
    !hasSemanticDescendant(node)
  ) {
    result.push(node);
    return;
  }
  for (const child of node.children ?? []) {
    collectSemanticBlocks(child, result);
  }
}

function markCodeAsNonTranslatable(node: HtmlNode) {
  if (isElement(node) && (node.name === "code" || node.name === "pre")) {
    node.attribs = { ...(node.attribs ?? {}), translate: "no" };
  }
  for (const child of node.children ?? []) {
    markCodeAsNonTranslatable(child);
  }
}

function renderNodes(nodes: readonly HtmlNode[]) {
  return nodes.map((node) => renderHtml(
    node as Parameters<typeof renderHtml>[0],
    { encodeEntities: "utf8" },
  )).join("");
}

function hasVisibleText(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}

export async function translateSemanticHtml(
  sourceHtml: string,
  sourceLocale?: string,
) {
  const sanitized = sanitizePhiHtmlWidgetMarkup(sourceHtml);
  if (!sanitized) {
    return "";
  }
  const document = parseDocument(sanitized) as unknown as HtmlNode;
  markCodeAsNonTranslatable(document);
  const blocks: HtmlNode[] = [];
  collectSemanticBlocks(document, blocks);
  const units = (blocks.length > 0 ? blocks : [document])
    .map((node) => ({ node, html: renderNodes(node.children ?? []) }))
    .filter((unit) => hasVisibleText(unit.html));
  if (units.length === 0) {
    return sanitized;
  }
  const translated = await trBulk(
    units.map((unit) => unit.html),
    0,
    "html",
    sourceLocale,
  );
  units.forEach((unit, index) => {
    const fragment = parseDocument(translated[index] ?? unit.html) as unknown as HtmlNode;
    unit.node.children = fragment.children ?? [];
    for (const child of unit.node.children) {
      child.parent = unit.node;
    }
  });
  return sanitizePhiHtmlWidgetMarkup(renderNodes(document.children ?? []));
}
