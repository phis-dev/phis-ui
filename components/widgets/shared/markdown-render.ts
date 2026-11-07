import { cache } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

import { trBulk, trBulkForLocale } from "../../../server-helpers/translate";
import type { PhiBlockRuntime, PhiRenderableBlockRenderMode } from "../../../types";
import type { PhiCmsResolvedContent } from "../../../types/cms";
import type { PhiMarkdownTocHeading } from "../../../types/markdown";
import type { PhiMarkdownBlock, PhiMarkdownFigure, PhiMarkdownInline, PhiMarkdownTableAlign } from "./markdown-body-client";
import type { PhiPublicMediaAssetReference } from "../../../types/media";
import type { PhiMarkdownImageFloat } from "../../../types/core-widget-placements";
import { resolvePhiImagePresentation } from "../../media/image-presentation";
import { isPhiMediaSvgContentType } from "../../../constants/media";
import {
  readPhiMarkdownImageAddress,
  resolvePhiMarkdownImageAspectRatioCss,
  resolvePhiMarkdownImageAspectRatioValue,
  type PhiMarkdownFigureFloat,
  type PhiMarkdownImageAspectRatio,
} from "./markdown-image-vocabulary";
import { resolvePhiCodeLanguage, tokenizePhiCode } from "./markdown-code-tokens";
import { readPhiInternalReference, type PhiPageReference } from "../../../types/references";
import { resolvePhiWidgetInternalReferences } from "../helpers/internal-reference-resolver.server";
import { protectPhiMailHref, splitPhiMailAddresses } from "../../../helpers/protected-mail";
import { resolvePhiWidgetSourceUrl } from "../helpers/widget-source-url";

type MarkdownNode = {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  url?: string;
  alt?: string;
  title?: string;
  /** A fenced block's info string, up to its first space. Absent on an indented code block. */
  lang?: string;
  children?: MarkdownNode[];
  /** GFM tables: one alignment per column, as the delimiter row states it. */
  align?: (string | null)[];
};

/**
 * Where Markdown comes from and how it is turned into blocks: inline text, a stored content field, or a
 * document fetched by URL, translated or not, with heading ids under a prefix of its own.
 *
 * The Foundation's, because more than the Core Markdown Widget renders Markdown -- the table of contents
 * reads the same headings, a News entry draws its body with it. The Widget's config carries these
 * fields among its own and is passed as it is.
 */
export type PhiMarkdownSourceConfig = {
  sourceMode?: "inline" | "url";
  markdown?: string;
  widgetId?: string | number | null;
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
  translate?: boolean;
  tocKey?: string;
  resolvedContent?: PhiCmsResolvedContent | null;
  renderMode?: PhiRenderableBlockRenderMode;
  /**
   * How much of the document is wanted. `first-paragraph` is a teaser's: the document is parsed whole and
   * cut to its first paragraph before anything is translated, so a card under an entry does not pay a
   * provider for paragraphs nobody is shown. `document`, the default, is all of it.
   */
  extent?: "document" | "first-paragraph";
  /**
   * How many levels a heading moves down. A text that stands under a title of its own -- an entry under its
   * header -- starts at `h2`, so `#` does not draw a second title of the same size. The level stops at 5.
   */
  headingOffset?: number;
  /** What every picture in the text does, unless its own address says otherwise (`markdown-image-vocabulary.ts`). */
  imageAspectRatio?: PhiMarkdownImageAspectRatio;
  imageFloat?: PhiMarkdownImageFloat;
};

/** A Media picture found in the text, by the address its image node carries after the projection. */
type MarkdownFigureSource = {
  asset: PhiPublicMediaAssetReference;
  aspectRatio?: PhiMarkdownImageAspectRatio;
  float?: PhiMarkdownFigureFloat;
};

const MARKDOWN_DEFAULT_REVALIDATE_SECONDS = 14400;

export type MarkdownRenderData = {
  blocks: PhiMarkdownBlock[];
  headings: PhiMarkdownTocHeading[];
};

type MarkdownMapContext = {
  headings: PhiMarkdownTocHeading[];
  headingIdCounts: Map<string, number>;
  headingIdPrefix: string | null;
  headingOffset: number;
};

function normalizeMarkdownSourceUrl(sourceUrl: string, publicUrl: string | null | undefined) {
  const trimmed = resolvePhiWidgetSourceUrl(sourceUrl, publicUrl);
  const githubBlobMatch = trimmed.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/,
  );

  if (!githubBlobMatch) {
    return trimmed;
  }

  const [, owner, repo, ref, path] = githubBlobMatch;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${path}`;
}

const loadRemoteMarkdown = cache(async function loadRemoteMarkdown(
  resolvedUrl: string,
  revalidateSeconds: number,
) {
  const response = await fetch(resolvedUrl, {
    ...(revalidateSeconds > 0
      ? { next: { revalidate: revalidateSeconds } }
      : { cache: "no-store" as const }),
    headers: {
      accept: "text/markdown, text/plain;q=0.9, */*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load markdown from ${resolvedUrl}: ${response.status}`);
  }

  return response.text();
});

function parseMarkdown(markdown: string) {
  return unified().use(remarkParse).use(remarkGfm).parse(markdown) as MarkdownNode;
}

function normalizePotentialPhiScheme(value: string) {
  let current = value.trim().replace(/&colon;/giu, ":").replace(/&#0*58;|&#x0*3a;/giu, ":");
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current.replace(/[\u0000-\u0020]+/gu, "").toLowerCase();
}

/*
 * The schemes a link or picture in a fetched document may carry: the same list the inline path allows
 * (`projectInternalMarkdownNodes`). A relative address is resolved against the document and comes out
 * `http(s):`; an absolute one is kept only on this list. Resolving first and trusting whatever `URL`
 * accepted let `javascript:` and `data:` through here while the inline path refused them.
 */
const PHI_EXTERNAL_DOCUMENT_URL_SCHEMES = /^(?:https?:|mailto:|tel:)$/iu;

/*
 * A picture written into the text itself may also be a data URL of an image type -- the one way a Module
 * brings a drawing with its copy, since it cannot put a file into the Site's `public/`. An `<img>` runs
 * nothing it loads, an SVG's scripts included, so the type list is what keeps this a picture. Links
 * stay on the scheme list above, and a fetched document gets no data URLs at all.
 */
const PHI_INLINE_IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|gif|webp|svg\+xml)[;,]/iu;

function resolveExternalDocumentUrl(value: string, sourceUrl: string) {
  const normalized = value.trim();
  if (!normalized || normalizePotentialPhiScheme(normalized).startsWith("phis:")) return null;
  if (normalized.startsWith("#")) return normalized;
  try {
    const resolved = new URL(normalized, sourceUrl);
    return PHI_EXTERNAL_DOCUMENT_URL_SCHEMES.test(resolved.protocol) ? resolved.toString() : null;
  } catch {
    return null;
  }
}

/*
 * The address a reader is sent to for the document the text was fetched from. GitHub serves a file's
 * bytes on one host and its page on another; the bytes are what the Widget reads and what a picture
 * needs, but a link in the text means the page -- a neighbouring document opened as raw text in a new
 * tab is the source, not the document. Any other host is its own page.
 */
function readExternalDocumentPageUrl(sourceUrl: string) {
  const githubRawMatch = sourceUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/u);
  if (!githubRawMatch) return sourceUrl;
  const [, owner, repo, ref, path] = githubRawMatch;
  return `https://github.com/${owner}/${repo}/blob/${ref}/${path}`;
}

function projectExternalMarkdownNodes(
  nodes: MarkdownNode[] | undefined,
  sourceUrl: string,
  pageUrl = readExternalDocumentPageUrl(sourceUrl),
): MarkdownNode[] {
  return (nodes ?? []).flatMap((node) => {
    const children = projectExternalMarkdownNodes(node.children, sourceUrl, pageUrl);
    if (node.type === "link") {
      const url = resolveExternalDocumentUrl(node.url ?? "", pageUrl);
      return url ? [{ ...node, url, children }] : children;
    }
    if (node.type === "image") {
      const url = resolveExternalDocumentUrl(node.url ?? "", sourceUrl);
      return url ? [{ ...node, url, children }] : [];
    }
    return [{ ...node, ...(node.children ? { children } : {}) }];
  });
}

async function projectInternalMarkdownNodes(
  tree: MarkdownNode,
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer">,
): Promise<Map<string, MarkdownFigureSource>> {
  const pageReferences: PhiPageReference[] = [];
  const assetIds: number[] = [];
  const figures = new Map<string, MarkdownFigureSource>();
  const collect = (nodes: MarkdownNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "link" || node.type === "image") {
        const reference = readPhiInternalReference(node.type === "image" ? readPhiMarkdownImageAddress(node.url ?? "").reference : node.url);
        if (reference?.kind === "page") pageReferences.push(reference.reference);
        if (reference?.kind === "asset") assetIds.push(reference.assetId);
      }
      collect(node.children);
    }
  };
  collect(tree.children);
  const resolved = await resolvePhiWidgetInternalReferences({ runtime, pageReferences, assetIds });
  const project = (nodes: MarkdownNode[] | undefined): MarkdownNode[] => (nodes ?? []).flatMap((node) => {
    const children = project(node.children);
    if (node.type === "link") {
      const reference = readPhiInternalReference(node.url);
      if (reference?.kind === "page") {
        const path = resolved.pagePaths.get(reference.reference);
        return path ? [{ ...node, url: `${path}${reference.fragment ? `#${encodeURIComponent(reference.fragment)}` : ""}`, children }] : children;
      }
      if ((node.url ?? "").startsWith("/") || (!/^(?:https?:|mailto:|tel:|#)/iu.test(node.url ?? ""))) return children;
      return [{ ...node, children }];
    }
    if (node.type === "image") {
      const address = readPhiMarkdownImageAddress(node.url ?? "");
      const reference = readPhiInternalReference(address.reference);
      if (reference?.kind === "asset") {
        const asset = resolved.assets.get(reference.assetId);
        if (!asset) return [];
        /*
         * Each picture gets an address of its own, so two pictures of one Asset can say different things:
         * the fragment never reaches the server, and it travels with the address through a translation.
         */
        const src = `${asset.deliveryUrl}#phi-figure-${figures.size}`;
        figures.set(src, {
          asset,
          ...(address.aspectRatio ? { aspectRatio: address.aspectRatio } : {}),
          ...(address.float ? { float: address.float } : {}),
        });
        return [{ ...node, url: src, children }];
      }
      if (!/^https?:/iu.test(node.url ?? "") && !PHI_INLINE_IMAGE_DATA_URL.test(node.url ?? "")) return [];
      return [{ ...node, children }];
    }
    return [{ ...node, ...(node.children ? { children } : {}) }];
  });
  tree.children = project(tree.children);
  return figures;
}

/*
 * A paragraph that is one Media picture and nothing else is a figure: a block of its own, drawn by the
 * house's picture Control -- optimised, sized, its box reserved and its corners the Theme's. A picture in
 * the middle of a sentence, or one on somebody else's server, stays the plain picture it was.
 */
function promoteMarkdownFigures(
  blocks: PhiMarkdownBlock[],
  figures: ReadonlyMap<string, MarkdownFigureSource>,
  defaults: { aspectRatio?: PhiMarkdownImageAspectRatio; float?: PhiMarkdownImageFloat },
): PhiMarkdownBlock[] {
  if (figures.size === 0) return blocks;
  return blocks.map((block): PhiMarkdownBlock => {
    if (block.kind === "blockquote") return { ...block, children: promoteMarkdownFigures(block.children, figures, defaults) };
    if (block.kind === "list") return { ...block, items: block.items.map((item) => promoteMarkdownFigures(item, figures, defaults)) };
    if (block.kind !== "paragraph") return block;
    const content = block.inlines.filter((inline) => !(inline.kind === "text" && !inline.text.trim()));
    const only = content.length === 1 ? content[0] : null;
    const source = only?.kind === "image" ? figures.get(only.src) : undefined;
    if (!only || only.kind !== "image" || !source) return block;
    return { kind: "image", image: buildMarkdownFigure(only, source, defaults) };
  });
}

function buildMarkdownFigure(
  image: Extract<PhiMarkdownInline, { kind: "image" }>,
  source: MarkdownFigureSource,
  defaults: { aspectRatio?: PhiMarkdownImageAspectRatio; float?: PhiMarkdownImageFloat },
): PhiMarkdownFigure {
  const aspectRatio = source.aspectRatio ?? defaults.aspectRatio ?? "auto";
  const frameAspectRatio = resolvePhiMarkdownImageAspectRatioValue(aspectRatio);
  const { asset } = source;
  const presentation = resolvePhiImagePresentation({
    sourceKind: "asset",
    assetId: asset.id,
    variantKey: null,
    variantVersion: asset.variantVersion,
    deliveryRevision: asset.deliveryRevision,
    originalUrl: asset.deliveryUrl,
    focalRect: asset.focalRect,
    sourceWidth: asset.width,
    sourceHeight: asset.height,
    frameAspectRatio,
  });
  return {
    presentation,
    alt: (image.alt || asset.altText || "").trim(),
    ...(image.title ? { title: image.title } : {}),
    blurDataUrl: asset.blurDataUrl,
    // Only a public Asset resolves here; the optimiser takes every original that is not an SVG.
    optimizable: !isPhiMediaSvgContentType(asset.contentType),
    aspectRatio: resolvePhiMarkdownImageAspectRatioCss(aspectRatio),
    float: source.float ?? defaults.float ?? "none",
  };
}

function mapInlineNodes(nodes: MarkdownNode[] | undefined): PhiMarkdownInline[] {
  return (nodes ?? []).flatMap((node) => {
    switch (node.type) {
      case "text":
        return [{ kind: "text", text: node.value ?? "" }] as const;
      case "strong":
        return [{ kind: "strong", children: mapInlineNodes(node.children) }] as const;
      case "emphasis":
        return [{ kind: "emphasis", children: mapInlineNodes(node.children) }] as const;
      case "delete":
        return [{ kind: "delete", children: mapInlineNodes(node.children) }] as const;
      case "inlineCode":
        return [{ kind: "inline_code", text: node.value ?? "" }] as const;
      case "link": {
        const href = node.url?.trim() ?? "";
        return [{
          kind: "link",
          href,
          external: /^https?:\/\//.test(href),
          children: mapInlineNodes(node.children),
        }] as const;
      }
      case "image": {
        const title = node.title?.trim() ?? "";
        return node.url
          ? [{ kind: "image", src: node.url, alt: node.alt ?? "", ...(title ? { title } : {}) }] as const
          : [];
      }
      case "break":
        return [{ kind: "break" }] as const;
      default:
        return mapInlineNodes(node.children);
    }
  });
}

type MarkdownInlineUnitMetadata = {
  links: string[];
  images: string[];
  // Parallel to `images`: entry N is the title authored on image N, empty when there is none.
  titles: string[];
  code: string[];
};

type MarkdownTranslationUnit = {
  node: MarkdownNode;
  html: string;
  metadata: MarkdownInlineUnitMetadata;
};

function escapeTranslationHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function decodeTranslationHtml(value: string) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function serializeMarkdownInlines(
  nodes: MarkdownNode[] | undefined,
  metadata: MarkdownInlineUnitMetadata,
): string {
  return (nodes ?? []).map((node) => {
    switch (node.type) {
      case "text":
        return escapeTranslationHtml(node.value ?? "");
      case "strong":
        return `<x-strong>${serializeMarkdownInlines(node.children, metadata)}</x-strong>`;
      case "emphasis":
        return `<x-emphasis>${serializeMarkdownInlines(node.children, metadata)}</x-emphasis>`;
      case "delete":
        return `<x-delete>${serializeMarkdownInlines(node.children, metadata)}</x-delete>`;
      case "link": {
        const index = metadata.links.push(node.url?.trim() ?? "") - 1;
        return `<x-link data-index="${index}">${serializeMarkdownInlines(node.children, metadata)}</x-link>`;
      }
      case "image": {
        /*
         * The title is prose and gets translated, but as a unit of its own rather than as more content
         * inside the image token. Two separate sentences in one token read as one run of text: asked to
         * translate `alt` and title together, a translator returned them merged and re-split at a
         * different point. Keeping the token's shape also leaves every already-translated image
         * unchanged, since the string the catalogue is keyed by does not move.
         */
        const index = metadata.images.push(node.url?.trim() ?? "") - 1;
        metadata.titles[index] = node.title?.trim() ?? "";
        return `<x-image data-index="${index}">${escapeTranslationHtml(node.alt ?? "")}</x-image>`;
      }
      case "inlineCode": {
        const index = metadata.code.push(node.value ?? "") - 1;
        return `<x-code data-index="${index}" translate="no">${escapeTranslationHtml(node.value ?? "")}</x-code>`;
      }
      case "break":
        return "<br/>";
      default:
        return serializeMarkdownInlines(node.children, metadata);
    }
  }).join("");
}

function collectMarkdownTranslationUnits(node: MarkdownNode, units: MarkdownTranslationUnit[]) {
  if (node.type === "heading" || node.type === "paragraph" || node.type === "tableCell") {
    const metadata: MarkdownInlineUnitMetadata = { links: [], images: [], titles: [], code: [] };
    const html = serializeMarkdownInlines(node.children, metadata);
    if (html.replace(/<[^>]+>/g, "").trim()) {
      units.push({ node, html, metadata });
    }
    return;
  }
  if (node.type === "code" || node.type === "inlineCode" || node.type === "html") {
    return;
  }
  for (const child of node.children ?? []) {
    collectMarkdownTranslationUnits(child, units);
  }
}

type MarkdownInlineFrame = {
  kind: "root" | "strong" | "emphasis" | "delete" | "link" | "image" | "code";
  index?: number;
  children: PhiMarkdownInline[];
};

function parseTranslatedMarkdownInlines(
  translatedHtml: string,
  metadata: MarkdownInlineUnitMetadata,
): PhiMarkdownInline[] | null {
  const stack: MarkdownInlineFrame[] = [{ kind: "root", children: [] }];
  const tokenPattern = /<\/?x-(?:strong|emphasis|delete|link|image|code)\b[^>]*>|<br\s*\/?>/gi;
  let cursor = 0;
  const appendText = (value: string) => {
    if (value) stack.at(-1)?.children.push({ kind: "text", text: decodeTranslationHtml(value) });
  };
  for (const match of translatedHtml.matchAll(tokenPattern)) {
    appendText(translatedHtml.slice(cursor, match.index));
    const token = match[0];
    cursor = (match.index ?? 0) + token.length;
    if (/^<br/i.test(token)) {
      stack.at(-1)?.children.push({ kind: "break" });
      continue;
    }
    const closing = /^<\//.test(token);
    const kindMatch = token.match(/^<\/?x-(strong|emphasis|delete|link|image|code)/i);
    const kind = kindMatch?.[1]?.toLowerCase() as MarkdownInlineFrame["kind"] | undefined;
    if (!kind) return null;
    if (!closing) {
      const indexMatch = token.match(/data-index=["']?(\d+)/i);
      stack.push({ kind, index: indexMatch ? Number(indexMatch[1]) : undefined, children: [] });
      continue;
    }
    const frame = stack.pop();
    if (!frame || frame.kind !== kind || stack.length === 0) return null;
    const parent = stack.at(-1);
    if (!parent) return null;
    if (kind === "strong" || kind === "emphasis" || kind === "delete") {
      parent.children.push({ kind, children: frame.children });
    } else if (kind === "link") {
      const href = metadata.links[frame.index ?? -1];
      if (href == null) return null;
      parent.children.push({ kind: "link", href, external: /^https?:\/\//.test(href), children: frame.children });
    } else if (kind === "image") {
      const src = metadata.images[frame.index ?? -1];
      if (src == null) return null;
      const title = metadata.titles[frame.index ?? -1]?.trim() ?? "";
      parent.children.push({
        kind: "image",
        src,
        alt: getInlineText(frame.children),
        ...(title ? { title } : {}),
      });
    } else if (kind === "code") {
      const text = metadata.code[frame.index ?? -1];
      if (text == null) return null;
      parent.children.push({ kind: "inline_code", text });
    }
  }
  appendText(translatedHtml.slice(cursor));
  return stack.length === 1 ? stack[0]?.children ?? [] : null;
}

/*
 * The render's own locale where there is one. A static render has no request to ask: `trBulk` reads the
 * locale from the request headers, finds none, and answers in the Site's default -- which left every
 * static Public page's body in its source language under a translated header.
 */
function translateUnits(
  locale: string | undefined,
  msgs: string[],
  format: "html" | "text",
  sourceLocale?: string,
) {
  return locale
    ? trBulkForLocale(locale, msgs, 0, format, sourceLocale)
    : trBulk(msgs, 0, format, sourceLocale);
}

async function buildMarkdownInlineMap(
  tree: MarkdownNode,
  translate: boolean,
  sourceLocale?: string,
  locale?: string,
) {
  const units: MarkdownTranslationUnit[] = [];
  collectMarkdownTranslationUnits(tree, units);
  const translated = translate && units.length > 0
    ? await translateUnits(locale, units.map((unit) => unit.html), "html", sourceLocale)
    : units.map((unit) => unit.html);

  /*
   * Image titles are prose and translate as plain text, each on its own: they are separate sentences
   * from the alt text they sit beside, and asking for both in one string invites a translator to merge
   * them. They are collected across every unit so this stays one request.
   */
  const titleSlots = units.flatMap((unit) =>
    unit.metadata.titles.flatMap((title, index) => title ? [{ metadata: unit.metadata, index, title }] : []),
  );
  if (translate && titleSlots.length > 0) {
    const translatedTitles = await translateUnits(locale, titleSlots.map((slot) => slot.title), "text", sourceLocale);
    titleSlots.forEach((slot, index) => {
      slot.metadata.titles[slot.index] = translatedTitles[index] || slot.title;
    });
  }

  return new Map(units.map((unit, index) => [
    unit.node,
    parseTranslatedMarkdownInlines(translated[index] ?? unit.html, unit.metadata) ?? mapInlineNodes(unit.node.children),
  ]));
}

function getInlineText(inlines: PhiMarkdownInline[]): string {
  return inlines
    .map((inline) => {
      switch (inline.kind) {
        case "text":
        case "inline_code":
          return inline.text;
        case "strong":
        case "emphasis":
        case "delete":
        case "link":
          return getInlineText(inline.children);
        case "image":
          return inline.alt;
        case "break":
          return " ";
      }
    })
    .join("");
}

function slugifyMarkdownHeading(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u00c0-\u024f]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "heading";
}

function resolveMarkdownHeadingId(text: string, context: MarkdownMapContext) {
  const baseId = slugifyMarkdownHeading(text);
  const count = context.headingIdCounts.get(baseId) ?? 0;
  context.headingIdCounts.set(baseId, count + 1);
  const id = count === 0 ? baseId : `${baseId}-${count + 1}`;
  return context.headingIdPrefix ? `${context.headingIdPrefix}-${id}` : id;
}

function mapBlockNodes(
  nodes: MarkdownNode[] | undefined,
  context: MarkdownMapContext,
  inlineMap: Map<MarkdownNode, PhiMarkdownInline[]>,
): PhiMarkdownBlock[] {
  const blocks: PhiMarkdownBlock[] = [];

  for (const node of nodes ?? []) {
    if (node.type === "definition") {
      continue;
    }

    switch (node.type) {
      case "heading": {
        const level = Math.min(Math.max((node.depth ?? 1) + context.headingOffset, 1), 5) as 1 | 2 | 3 | 4 | 5;
        const inlines = inlineMap.get(node) ?? mapInlineNodes(node.children);
        const text = getInlineText(inlines).trim();
        const id = resolveMarkdownHeadingId(text, context);
        context.headings.push({ id, level, text: text || `Heading ${context.headings.length + 1}` });
        blocks.push({
          kind: "heading",
          id,
          level,
          inlines,
        });
        break;
      }
      case "paragraph":
        blocks.push({
          kind: "paragraph",
          inlines: inlineMap.get(node) ?? mapInlineNodes(node.children),
        });
        break;
      case "blockquote":
        blocks.push({
          kind: "blockquote",
          children: mapBlockNodes(node.children, context, inlineMap),
        });
        break;
      case "list":
        blocks.push({
          kind: "list",
          ordered: node.ordered === true,
          start: node.start,
          items: mapListItems(node.children, context, inlineMap),
        });
        break;
      case "code": {
        /*
         * Coloured here rather than in the browser, because a code sample never changes after it is
         * rendered: the reader is sent the pieces and no highlighter. Fences are not translated
         * either (see the inline collector above), so what is tokenized is what was written.
         */
        const language = resolvePhiCodeLanguage(node.lang);
        blocks.push({
          kind: "code",
          language,
          tokens: tokenizePhiCode(node.value ?? "", language),
        });
        break;
      }
      case "thematicBreak":
        blocks.push({
          kind: "divider",
        });
        break;
      case "table": {
        const tableRows = node.children ?? [];
        const cells = tableRows.map((row) => (row.children ?? []).map((cell) =>
          inlineMap.get(cell) ?? mapInlineNodes(cell.children)));
        const header = cells[0] ?? [];
        const align = header.map((_, columnIndex) => readMarkdownTableAlign(node.align?.[columnIndex]));
        blocks.push({ kind: "table", header, rows: cells.slice(1), align });
        break;
      }
    }
  }

  return blocks;
}

function mapListItems(
  nodes: MarkdownNode[] | undefined,
  context: MarkdownMapContext,
  inlineMap: Map<MarkdownNode, PhiMarkdownInline[]>,
) {
  const items: PhiMarkdownBlock[][] = [];
  for (const child of nodes ?? []) {
    items.push(mapBlockNodes(child.children, context, inlineMap));
  }
  return items;
}

type ResolvedMarkdownSource =
  | { ok: true; markdown: string }
  | { ok: false; message: string };

export async function resolveMarkdownSource(
  config: PhiMarkdownSourceConfig | undefined,
  publicUrl: string | null | undefined,
): Promise<ResolvedMarkdownSource> {
  if (!config) {
    return { ok: true, markdown: "" };
  }

  const inlineMarkdown = config.markdown?.trim() ?? "";
  const sourceMode = config.sourceMode ?? (config.sourceUrl?.trim() ? "url" : "inline");
  const sourceUrl = config.sourceUrl?.trim() ?? "";

  if (sourceMode === "url") {
    if (!sourceUrl) {
      return { ok: true, markdown: "" };
    }

    try {
      const markdown = await loadRemoteMarkdown(
        normalizeMarkdownSourceUrl(sourceUrl, publicUrl),
        config.revalidateSeconds ?? MARKDOWN_DEFAULT_REVALIDATE_SECONDS,
      );
      return { ok: true, markdown };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : `Failed to load markdown from ${sourceUrl}.`,
      };
    }
  }

  if (config.renderMode === "editor" || config.renderMode === "preview") {
    return { ok: true, markdown: inlineMarkdown };
  }

  const resolvedMarkdown = config.resolvedContent?.textFields.markdown?.source?.trim() ?? "";
  return { ok: true, markdown: resolvedMarkdown || inlineMarkdown };
}

export async function resolveMarkdownRenderData(
  config: PhiMarkdownSourceConfig | undefined,
  runtime?: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer">,
): Promise<MarkdownRenderData | { error: string }> {
  const resolvedSource = await resolveMarkdownSource(config, runtime?.site.publicUrl);

  if (!resolvedSource.ok) {
    return { error: resolvedSource.message };
  }

  const markdown = resolvedSource.markdown;
  if (!markdown.trim()) {
    return { blocks: [], headings: [] };
  }

  const headingIdPrefix =
    config?.widgetId != null
      ? `markdown-${config.widgetId}`
      : config?.tocKey
        ? `markdown-${config.tocKey}`
        : null;
  const sourceMode = config?.sourceMode ?? (config?.sourceUrl?.trim() ? "url" : "inline");
  return resolveMarkdownRenderDataFromSource(
    markdown,
    config?.translate !== false,
    headingIdPrefix,
    /*
     * The declared language counts for inline text too, not only for a fetched document.
     *
     * It used to be read only in `url` mode, when the only foreign text was somebody else's page. Inline
     * Markdown now arrives from News entries, where an author writes in their own language and Core keeps
     * that language beside the words. Stating it is what sends each paragraph the external route --
     * translated into the Site's language once, the original kept as the answer for its own -- instead of
     * being handed to a provider as though it were already canonical. An empty value means canonical and
     * is what every existing Widget has.
     */
    config?.sourceLocale?.trim() || undefined,
    sourceMode,
    sourceMode === "url" && config?.sourceUrl
      ? normalizeMarkdownSourceUrl(config.sourceUrl, runtime?.site.publicUrl)
      : null,
    runtime,
    config?.extent ?? "document",
    config?.headingOffset ?? 0,
    {
      ...(config?.imageAspectRatio ? { aspectRatio: config.imageAspectRatio } : {}),
      ...(config?.imageFloat ? { float: config.imageFloat } : {}),
    },
  );
}

async function resolveMarkdownRenderDataFromSource(
  markdown: string,
  translate: boolean,
  headingIdPrefix: string | null,
  sourceLocale?: string,
  sourceMode: "inline" | "url" = "inline",
  sourceUrl: string | null = null,
  runtime?: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer">,
  extent: "document" | "first-paragraph" = "document",
  headingOffset = 0,
  imageDefaults: { aspectRatio?: PhiMarkdownImageAspectRatio; float?: PhiMarkdownImageFloat } = {},
): Promise<MarkdownRenderData> {
  const tree = parseMarkdown(markdown);
  if (extent === "first-paragraph") {
    // Cut by the parser's own reading, never by blank lines: a fence or a list may hold those too.
    const paragraph = tree.children?.find((node) => node.type === "paragraph");
    tree.children = paragraph ? [paragraph] : [];
  }
  let figures: ReadonlyMap<string, MarkdownFigureSource> = new Map();
  if (sourceMode === "url" && sourceUrl) {
    tree.children = projectExternalMarkdownNodes(tree.children, sourceUrl);
  } else if (runtime) {
    figures = await projectInternalMarkdownNodes(tree, runtime);
  }
  const context: MarkdownMapContext = {
    headings: [],
    headingIdCounts: new Map(),
    headingIdPrefix,
    headingOffset,
  };
  const inlineMap = await buildMarkdownInlineMap(tree, translate, sourceLocale, runtime?.locale.current);
  const blocks = promoteMarkdownFigures(
    protectMarkdownMail(mapBlockNodes(tree.children, context, inlineMap)),
    figures,
    imageDefaults,
  );

  return { blocks, headings: context.headings };
}

/** remark-gfm states `left`, `center`, `right` or nothing; nothing else can come out of its parser. */
function readMarkdownTableAlign(value: string | null | undefined): PhiMarkdownTableAlign {
  if (value === "left" || value === "center" || value === "right") {
    return value;
  }
  if (value == null) {
    return null;
  }
  throw new Error(`Unknown Markdown table alignment "${value}".`);
}

/*
 * Every address in the finished blocks, protected (`helpers/protected-mail.ts`): a `mailto:` link's
 * target, and an address written as text, a link's own label among them. Once, over the blocks, because
 * they are built along two roads -- straight from the tree and back out of a translation.
 */
function protectMarkdownMail(blocks: PhiMarkdownBlock[]): PhiMarkdownBlock[] {
  return blocks.map((block): PhiMarkdownBlock => {
    switch (block.kind) {
      case "heading":
      case "paragraph":
        return { ...block, inlines: protectMarkdownInlineMail(block.inlines) };
      case "blockquote":
        return { ...block, children: protectMarkdownMail(block.children) };
      case "list":
        return { ...block, items: block.items.map(protectMarkdownMail) };
      case "table":
        return {
          ...block,
          header: block.header.map(protectMarkdownInlineMail),
          rows: block.rows.map((cells) => cells.map(protectMarkdownInlineMail)),
        };
      default:
        return block;
    }
  });
}

function protectMarkdownInlineMail(inlines: PhiMarkdownInline[]): PhiMarkdownInline[] {
  return inlines.flatMap((inline): PhiMarkdownInline[] => {
    switch (inline.kind) {
      case "text":
        return splitPhiMailAddresses(inline.text).map((segment): PhiMarkdownInline =>
          segment.kind === "mail" ? { kind: "mail_text", token: segment.token } : { kind: "text", text: segment.text });
      case "link":
        return [{ ...inline, href: protectPhiMailHref(inline.href), children: protectMarkdownInlineMail(inline.children) }];
      case "strong":
      case "emphasis":
      case "delete":
        return [{ ...inline, children: protectMarkdownInlineMail(inline.children) }];
      default:
        return [inline];
    }
  });
}
