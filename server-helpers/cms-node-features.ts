import "server-only";

import { phiRuntime } from "./phi-runtime";
import { logRuntimeEvent } from "../net/log";
import {
  collectPhiCmsNodeFeatureNamespaces,
  readPhiCmsNodeVisibleWhen,
} from "../helpers/cms-node-visibility";
import type { PhiRuntimeFeatureState } from "../types/runtime-condition";
import type { PhiBlockRuntime } from "../types";
import type { PhiCmsRuntimeRenderRegistry } from "../types/cms-plugins";
import type { PhiResolvedCmsRenderableTree } from "../types/cms";

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
    for (const namespace of collectPhiCmsNodeFeatureNamespaces(readPhiCmsNodeVisibleWhen(node.config))) {
      namespaces.add(namespace);
    }
  }
  return namespaces;
}

/**
 * What the Modules answered, and which of them could not be asked.
 *
 * `features` is null when the tree asks nothing. `failures` names every namespace the tree asked about
 * that has no answer -- no active Module publishes it, its loader threw, or its resolver did -- with
 * the reason, so the renderer can say so where the node would have stood instead of leaving a hole
 * that reads as "the Module has nothing to show".
 */
export type PhiCmsTreeFeatureResolution = {
  features: PhiRuntimeFeatureState | null;
  failures: ReadonlyMap<string, string>;
};

/**
 * What the active Modules say about this Site, for the namespaces this page asked about.
 *
 * A Module that cannot answer is left out rather than guessed at: its namespace stays absent, every
 * condition over it reads `unavailable`, and the node it guards stays hidden. For a sign-in that is the
 * right way round -- a method whose configuration could not be read is not a method to offer. The
 * failure itself is not swallowed: it is logged with the namespace, and handed back in `failures` for
 * the renderer to show the author (`renderCmsDiagnostic`, code `feature-unavailable`).
 */
export async function resolvePhiCmsTreeFeatures(
  tree: Pick<PhiResolvedCmsRenderableTree, "layoutNodes" | "contentWidgets" | "overlays">,
  registry: Pick<PhiCmsRuntimeRenderRegistry, "featureResolverLoadersByNamespace">,
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area">,
): Promise<PhiCmsTreeFeatureResolution> {
  const namespaces = collectPhiCmsFeatureNamespaces(tree);
  const failures = new Map<string, string>();
  if (namespaces.size === 0) {
    return { features: null, failures };
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
    if (!load) {
      failures.set(namespace, `No active Module publishes the "${namespace}" features.`);
      return null;
    }
    try {
      const resolve = await load();
      return [namespace, await resolve(context)] as const;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.set(namespace, message);
      logRuntimeEvent("error", "cms.features.resolve_failed", {
        message: `Failed to resolve "${namespace}" features for this render.`,
        siteKey: rt.siteKey,
        area: runtime.area,
        error,
        meta: { namespace },
      });
      return null;
    }
  }));

  const features: Record<string, unknown> = {};
  for (const entry of resolved) {
    if (entry) features[entry[0]] = entry[1];
  }
  return { features, failures };
}
