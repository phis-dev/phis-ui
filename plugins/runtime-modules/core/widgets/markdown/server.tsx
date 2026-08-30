import { cache } from "react";
import { headers } from "next/headers";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { trBulk } from "../../../../../server-helpers/translate";
import type { PhiBlockRuntime, PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type { PhiCmsMarkdownWidgetConfig } from "./config";
import type { PhiMarkdownTocHeading } from "../markdown-toc/config";
import type { PhiMarkdownBlock, PhiMarkdownInline } from "./client";
import { readPhiInternalReference, type PhiPageReference } from "../../../../../types/references";
import { resolvePhiWidgetInternalReferences } from "../../../../../components/widgets/helpers/internal-reference-resolver.server";

type MarkdownNode = {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number;
  url?: string;
  alt?: string;
  title?: string;
  children?: MarkdownNode[];
};

export type PhiMarkdownWidgetProps = PhiServerBlockBaseProps<
  PhiNoLabels,
  PhiCmsMarkdownWidgetConfig
>;

const MARKDOWN_DEFAULT_REVALIDATE_SECONDS = 14400;

type MarkdownRenderData = {
  blocks: PhiMarkdownBlock[];
  headings: PhiMarkdownTocHeading[];
};

type MarkdownMapContext = {
  headings: PhiMarkdownTocHeading[];
  headingIdCounts: Map<string, number>;
  headingIdPrefix: string | null;
};

async function normalizeMarkdownSourceUrl(sourceUrl: string) {
  const trimmed = sourceUrl.trim();
  if (trimmed.startsWith("/")) {
    const requestHeaders = await headers();
    const host =
      requestHeaders.get("x-forwarded-host") ??
      requestHeaders.get("host") ??
      "";
    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

    if (!host) {
      throw new Error(`Cannot resolve relative markdown source without request host: ${sourceUrl}`);
    }

    return `${protocol}://${host}${trimmed}`;
  }

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
  sourceUrl: string,
  revalidateSeconds: number,
) {
  const resolvedUrl = await normalizeMarkdownSourceUrl(sourceUrl);
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

function resolveExternalDocumentUrl(value: string, sourceUrl: string) {
  const normalized = value.trim();
  if (!normalized || normalizePotentialPhiScheme(normalized).startsWith("phi:")) return null;
  if (normalized.startsWith("#") || /^(?:https?:|mailto:|tel:)/iu.test(normalized)) return normalized;
  try {
    return new URL(normalized, sourceUrl).toString();
  } catch {
    return null;
  }
}

function projectExternalMarkdownNodes(nodes: MarkdownNode[] | undefined, sourceUrl: string): MarkdownNode[] {
  return (nodes ?? []).flatMap((node) => {
    const children = projectExternalMarkdownNodes(node.children, sourceUrl);
    if (node.type === "link") {
      const url = resolveExternalDocumentUrl(node.url ?? "", sourceUrl);
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
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">,
) {
  const pageReferences: PhiPageReference[] = [];
  const assetIds: number[] = [];
  const collect = (nodes: MarkdownNode[] | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "link" || node.type === "image") {
        const reference = readPhiInternalReference(node.url);
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
      const reference = readPhiInternalReference(node.url);
      if (reference?.kind === "asset") {
        const src = resolved.assetUrls.get(reference.assetId);
        return src ? [{ ...node, url: src, children }] : [];
      }
      if (!/^https?:/iu.test(node.url ?? "")) return [];
      return [{ ...node, children }];
    }
    return [{ ...node, ...(node.children ? { children } : {}) }];
  });
  tree.children = project(tree.children);
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

async function buildMarkdownInlineMap(
  tree: MarkdownNode,
  translate: boolean,
  sourceLocale?: string,
) {
  const units: MarkdownTranslationUnit[] = [];
  collectMarkdownTranslationUnits(tree, units);
  const translated = translate && units.length > 0
    ? await trBulk(units.map((unit) => unit.html), 0, "html", sourceLocale)
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
    const translatedTitles = await trBulk(titleSlots.map((slot) => slot.title), 0, "text", sourceLocale);
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
        const level = Math.min(Math.max(node.depth ?? 1, 1), 5) as 1 | 2 | 3 | 4 | 5;
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
      case "code":
        blocks.push({
          kind: "code",
          text: node.value ?? "",
        });
        break;
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
        blocks.push({ kind: "table", header, rows: cells.slice(1) });
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
  config: PhiCmsMarkdownWidgetConfig | undefined,
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
        sourceUrl,
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
  config: PhiCmsMarkdownWidgetConfig | undefined,
  runtime?: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">,
): Promise<MarkdownRenderData | { error: string }> {
  const resolvedSource = await resolveMarkdownSource(config);

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
    sourceMode === "url" ? config?.sourceLocale?.trim() : undefined,
    sourceMode,
    sourceMode === "url" && config?.sourceUrl
      ? await normalizeMarkdownSourceUrl(config.sourceUrl)
      : null,
    runtime,
  );
}

async function resolveMarkdownRenderDataFromSource(
  markdown: string,
  translate: boolean,
  headingIdPrefix: string | null,
  sourceLocale?: string,
  sourceMode: "inline" | "url" = "inline",
  sourceUrl: string | null = null,
  runtime?: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">,
): Promise<MarkdownRenderData> {
  const tree = parseMarkdown(markdown);
  if (sourceMode === "url" && sourceUrl) {
    tree.children = projectExternalMarkdownNodes(tree.children, sourceUrl);
  } else if (runtime) {
    await projectInternalMarkdownNodes(tree, runtime);
  }
  const context: MarkdownMapContext = { headings: [], headingIdCounts: new Map(), headingIdPrefix };
  const inlineMap = await buildMarkdownInlineMap(tree, translate, sourceLocale);
  const blocks = mapBlockNodes(tree.children, context, inlineMap);

  return { blocks, headings: context.headings };
}

export async function PhiMarkdownWidget({
  config,
  runtime,
}: PhiMarkdownWidgetProps) {
  const renderData = await resolveMarkdownRenderData(config, runtime);

  if ("error" in renderData) {
    return (
      <PhiRuntimeModuleRenderClientHost
        type={PhiCmsWidgetType.Markdown}
        componentProps={{ config: { blocks: [], error: renderData.error } }}
      />
    );
  }

  if (renderData.blocks.length === 0) {
    return null;
  }

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Markdown}
      componentProps={{
        config: {
          ...config,
          blocks: renderData.blocks,
          headings: renderData.headings,
        },
      }}
    />
  );
}
