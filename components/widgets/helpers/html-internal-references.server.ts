import "server-only";

import renderNodes from "dom-serializer";
import { parseDocument } from "htmlparser2";

import type { PhiBlockRuntime } from "../../../types";
import { readPhiInternalReference, type PhiPageReference } from "../../../types/references";
import { resolvePhiWidgetInternalReferences } from "./internal-reference-resolver.server";

type HtmlNode = {
  type?: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: HtmlNode[];
};

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

function externalUrl(value: string, sourceUrl: string) {
  const normalized = value.trim();
  if (!normalized || normalizePotentialPhiScheme(normalized).startsWith("phis:")) return null;
  if (normalized.startsWith("#") || /^(?:https?:|mailto:|tel:)/iu.test(normalized)) return normalized;
  try {
    return new URL(normalized, sourceUrl).toString();
  } catch {
    return null;
  }
}

function walk(nodes: HtmlNode[], visit: (node: HtmlNode) => HtmlNode[] | null): HtmlNode[] {
  return nodes.flatMap((node) => {
    node.children = walk(node.children ?? [], visit);
    return visit(node) ?? [node];
  });
}

export async function resolvePhiHtmlReferences(input: {
  html: string;
  sourceMode: "inline" | "url";
  sourceUrl?: string | null;
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">;
}) {
  const document = parseDocument(input.html) as unknown as HtmlNode;
  if (input.sourceMode === "url") {
    const sourceUrl = input.sourceUrl?.trim();
    if (!sourceUrl) return "";
    document.children = walk(document.children ?? [], (node) => {
      if (node.name !== "a" && node.name !== "img") return null;
      const attribute = node.name === "a" ? "href" : "src";
      const resolved = externalUrl(node.attribs?.[attribute] ?? "", sourceUrl);
      if (resolved) {
        node.attribs = { ...(node.attribs ?? {}), [attribute]: resolved };
        return null;
      }
      return node.name === "a" ? node.children ?? [] : [];
    });
    return renderNodes(document.children as never);
  }

  const pageReferences: PhiPageReference[] = [];
  const assetIds: number[] = [];
  walk(document.children ?? [], (node) => {
    const value = node.name === "a" ? node.attribs?.href : node.name === "img" ? node.attribs?.src : null;
    const reference = readPhiInternalReference(value);
    if (reference?.kind === "page") pageReferences.push(reference.reference);
    if (reference?.kind === "asset") assetIds.push(reference.assetId);
    return null;
  });
  const resolved = await resolvePhiWidgetInternalReferences({
    runtime: input.runtime,
    pageReferences,
    assetIds,
  });
  document.children = walk(document.children ?? [], (node) => {
    if (node.name === "a") {
      const href = node.attribs?.href ?? "";
      const reference = readPhiInternalReference(href);
      if (reference?.kind === "page") {
        const path = resolved.pagePaths.get(reference.reference);
        if (!path) return node.children ?? [];
        node.attribs = {
          ...(node.attribs ?? {}),
          href: `${path}${reference.fragment ? `#${encodeURIComponent(reference.fragment)}` : ""}`,
        };
        return null;
      }
      if (href.startsWith("/") || (!/^(?:https?:|mailto:|tel:|#)/iu.test(href))) return node.children ?? [];
    }
    if (node.name === "img") {
      const src = node.attribs?.src ?? "";
      const reference = readPhiInternalReference(src);
      if (reference?.kind === "asset") {
        const deliveryUrl = resolved.assetUrls.get(reference.assetId);
        if (!deliveryUrl) return [];
        node.attribs = { ...(node.attribs ?? {}), src: deliveryUrl };
        return null;
      }
      if (!/^https?:/iu.test(src)) return [];
    }
    return null;
  });
  return renderNodes(document.children as never);
}
