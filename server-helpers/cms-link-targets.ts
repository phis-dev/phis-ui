import "server-only";

import { collectPhiLinkTargetReferences } from "../helpers/link-target";
import { resolvePhiWidgetInternalReferences } from "../components/widgets/helpers/internal-reference-resolver.server";
import type { PhiBlockRuntime } from "../types";
import type { PhiPageReference, PhiResolvedLinkTargets } from "../types/references";
import type { PhiResolvedCmsRenderableTree } from "../types/cms";

/**
 * Every Page this render's Widgets link to, resolved in one go before anything draws.
 *
 * The pass sits beside the feature pass for the same reason that one does: the tree is already in hand
 * here, and what a render needs from outside itself is cheaper to ask for once than to discover Widget
 * by Widget. `REFERENCES.md` requires exactly that -- resolvers batch per render -- and the alternative
 * is what a Card grid would otherwise do: twelve Cards, twelve round trips to the same endpoint, for
 * twelve answers that could have been one.
 *
 * A page that links to nothing gets `null` and costs nothing, which is most pages.
 */
export async function resolvePhiCmsTreeLinkTargets(
  tree: Pick<PhiResolvedCmsRenderableTree, "layoutNodes" | "contentWidgets" | "overlays">,
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer">,
): Promise<PhiResolvedLinkTargets | null> {
  const references = new Set<PhiPageReference>();
  for (const node of [...tree.overlays, ...tree.layoutNodes, ...tree.contentWidgets]) {
    collectPhiLinkTargetReferences(node.config, references);
  }
  if (references.size === 0) {
    return null;
  }

  try {
    const { pagePaths } = await resolvePhiWidgetInternalReferences({
      runtime,
      pageReferences: [...references],
      assetIds: [],
    });
    return pagePaths;
  } catch (error) {
    /*
     * A resolver that could not be reached leaves every target unresolved, which draws every link as
     * plain text. That is the contract's answer for one reference that does not resolve, and it is the
     * right answer for all of them at once: a page that cannot say where its links lead should say
     * nothing, not send readers to addresses it guessed.
     */
    console.error("Failed to resolve the Page targets for this render.", error);
    return null;
  }
}
