import "server-only";

import { phiRuntime } from "./phi-runtime";
import { readPhiCmsNodeVisibleWhen } from "../helpers/cms-node-visibility";
import {
  collectPhiRuntimeValueConditions,
  type PhiRuntimeFeatureState,
} from "../types/runtime-condition";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRuntimeRenderRegistry } from "../types/cms-plugins";
import type { PhiResolvedCmsRenderableTree } from "../types/cms";

function readNamespace(valuePath: string) {
  return valuePath.split(".")[0]?.trim() ?? "";
}

/**
 * Which Modules this page needs an answer from, read off the conditions it actually carries.
 *
 * A page that asks nothing gets an empty set and costs nothing, which is the point: the facts are a
 * Module's own configuration, and reading them means asking that Module's server half.
 */
export function collectPhiCmsFeatureNamespaces(
  tree: Pick<PhiResolvedCmsRenderableTree, "layoutNodes" | "contentWidgets" | "overlays">,
): Set<string> {
  const namespaces = new Set<string>();
  for (const node of [...tree.overlays, ...tree.layoutNodes, ...tree.contentWidgets]) {
    for (const condition of collectPhiRuntimeValueConditions(readPhiCmsNodeVisibleWhen(node.config))) {
      if (condition.source !== "feature") continue;
      const namespace = readNamespace(condition.valuePath);
      if (namespace) namespaces.add(namespace);
    }
  }
  return namespaces;
}

/**
 * What the active Modules say about this Site, for the namespaces this page asked about.
 *
 * A Module that cannot answer is left out rather than guessed at: its namespace stays absent, every
 * condition over it reads `unavailable`, and the node it guards stays hidden. For a sign-in that is the
 * right way round -- a method whose configuration could not be read is not a method to offer.
 */
export async function resolvePhiCmsTreeFeatures(
  tree: Pick<PhiResolvedCmsRenderableTree, "layoutNodes" | "contentWidgets" | "overlays">,
  registry: Pick<PhiCmsRuntimeRenderRegistry, "featureResolverLoadersByNamespace">,
  runtime: Pick<PhiBlockRuntime, "site" | "locale">,
): Promise<PhiRuntimeFeatureState | null> {
  const namespaces = collectPhiCmsFeatureNamespaces(tree);
  if (namespaces.size === 0) {
    return null;
  }

  const rt = phiRuntime(runtime);
  const context = {
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
    locale: runtime.locale.current,
  };

  const resolved = await Promise.all([...namespaces].map(async (namespace) => {
    const load = registry.featureResolverLoadersByNamespace.get(namespace);
    if (!load) return null;
    try {
      const resolve = await load();
      return [namespace, await resolve(context)] as const;
    } catch (error) {
      console.error(`Failed to resolve "${namespace}" features for this render.`, error);
      return null;
    }
  }));

  const features: Record<string, unknown> = {};
  for (const entry of resolved) {
    if (entry) features[entry[0]] = entry[1];
  }
  return features;
}
