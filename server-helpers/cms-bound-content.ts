import "server-only";

import { buildPhiCmsWidgetNamespacedTypeKey } from "../constants/cms-widget-types";
import { getBoundWidgetContents, type PhiBoundWidgetContent } from "../gateway/site-content";
import { resolvePhiCmsWidgetContentBindingForConfig } from "../helpers/cms-content-binding";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import type { PhiCmsContentWidgetNode } from "../types/cms";
import type { PhiCmsWidgetContentBinding, PhiRuntimeModuleCatalog } from "../types/cms-plugins";

const bindingsByCatalog = new WeakMap<PhiRuntimeModuleCatalog, ReadonlyMap<string, PhiCmsWidgetContentBinding>>();

/** Which Widget types bind content, and how, across every Module the catalog knows. */
function readPhiCmsContentBindingsByWidgetType(catalog: PhiRuntimeModuleCatalog) {
  const known = bindingsByCatalog.get(catalog);
  if (known) return known;
  const bindings = new Map<string, PhiCmsWidgetContentBinding>();
  for (const entry of catalog.values()) {
    for (const { definition } of entry.widgets) {
      if (definition.contentBinding) {
        bindings.set(
          buildPhiCmsWidgetNamespacedTypeKey(definition.pluginKey, definition.typeKey),
          definition.contentBinding,
        );
      }
    }
  }
  bindingsByCatalog.set(catalog, bindings);
  return bindings;
}

type PhiPresetTreeContentOptions = {
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  siteKey: string;
  locale?: string;
};

async function readPresetTreeBoundContents<TTree extends { contentWidgets: PhiCmsContentWidgetNode[] }>(
  trees: readonly TTree[],
  options: PhiPresetTreeContentOptions & { stage: "published" | "current"; cookieHeader?: string | null },
) {
  const bindings = readPhiCmsContentBindingsByWidgetType(options.runtimeModuleCatalog);
  const bound = new Map(trees.flatMap((tree) => tree.contentWidgets).flatMap((widget) => {
    const binding = resolvePhiCmsWidgetContentBindingForConfig(bindings.get(widget.widgetType), widget.config);
    return binding ? [[widget.id as string, binding] as const] : [];
  }));
  if (bound.size === 0) return { bound, byInstance: new Map<string, PhiBoundWidgetContent>() };
  const { apiBaseUrl, internalToken } = readPhiServerApiCredentials();
  const contents = await getBoundWidgetContents({
    apiBaseUrl,
    internalToken,
    siteKey: options.siteKey,
    instanceIds: [...bound.keys()],
    stage: options.stage,
    locale: options.locale,
    cookieHeader: options.cookieHeader,
  });
  return { bound, byInstance: new Map(contents.map((entry) => [entry.instanceId, entry])) };
}

/**
 * Puts the published content of a preset tree's bound Widgets in (phis-server CONTENT.md).
 *
 * A preset node is the Module's until somebody writes content for it; once a row is bound, its published
 * version is what the live Site shows. A row without a published version leaves the node as the preset
 * ships it. Trees the Site stored are answered with their content by phi-server and need none of this.
 */
export async function applyPhiPresetTreePublishedContent<TTree extends { contentWidgets: PhiCmsContentWidgetNode[] }>(
  tree: TTree,
  options: PhiPresetTreeContentOptions,
): Promise<TTree> {
  const { byInstance } = await readPresetTreeBoundContents([tree], { ...options, stage: "published" });
  if (![...byInstance.values()].some((entry) => entry.content)) return tree;
  return {
    ...tree,
    contentWidgets: tree.contentWidgets.map((widget) => {
      const entry = byInstance.get(widget.id);
      return entry?.content
        ? { ...widget, contentVersionId: entry.currentVersionId, resolvedContent: entry.content }
        : widget;
    }),
  };
}

/**
 * Puts the current content of a preset tree's bound Widgets in, for the Builder: into the bound field,
 * where an editor shows it and from where a save hands it back, and with the version it builds on. A
 * structure save that carried the preset's shipped text instead would read as an edit, and refuse.
 */
export async function applyPhiPresetTreeCurrentContent<TTree extends { contentWidgets: PhiCmsContentWidgetNode[] }>(
  tree: TTree,
  options: PhiPresetTreeContentOptions & { cookieHeader: string },
): Promise<TTree> {
  return (await applyPhiPresetTreesCurrentContent([tree], options))[0]!;
}

/**
 * The same for several trees with one content read. The Builder holds every Area's Shell on every view,
 * and a read per Area was a Core call per Area (AUDIT-2026-10-13, PM12).
 */
export async function applyPhiPresetTreesCurrentContent<TTree extends { contentWidgets: PhiCmsContentWidgetNode[] }>(
  trees: readonly TTree[],
  options: PhiPresetTreeContentOptions & { cookieHeader: string },
): Promise<TTree[]> {
  const { bound, byInstance } = await readPresetTreeBoundContents(trees, { ...options, stage: "current" });
  if (byInstance.size === 0) return [...trees];
  return trees.map((tree) => ({
    ...tree,
    contentWidgets: tree.contentWidgets.map((widget) => {
      const entry = byInstance.get(widget.id);
      const binding = bound.get(widget.id);
      if (!entry || !binding) return widget;
      return {
        ...widget,
        config: entry.value == null ? widget.config : { ...widget.config, [binding.sourceField]: entry.value },
        // Carried by a save outside a Canvas, so that the value put in above goes back as content.
        contentBinding: binding,
        contentVersionId: entry.currentVersionId,
        resolvedContent: entry.content,
      };
    }),
  }));
}
