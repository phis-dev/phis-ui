import "server-only";

import type { PhiCmsAreaKey } from "../constants/cms-areas";
import {
  collectPhiLinkTargetReferences,
  type PhiLinkTargetReference,
} from "../helpers/link-target";
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
  const references = new Map<string, PhiLinkTargetReference>();
  for (const node of [...tree.overlays, ...tree.layoutNodes, ...tree.contentWidgets]) {
    collectPhiLinkTargetReferences(node.config, references);
  }
  if (references.size === 0) {
    return null;
  }

  /*
   * Grouped by the Area each target named, because the resolver answers per Area: it reads the Page
   * Scopes of one Area and asks that Area's route table about Module Pages. Nearly every page groups
   * into one bucket -- a link that names no Area is asking in this one -- so the ordinary render still
   * costs a single round trip, and a page that reaches into another Area costs one more.
   */
  const byArea = new Map<PhiCmsAreaKey, PhiPageReference[]>();
  for (const entry of references.values()) {
    const area = entry.area ?? runtime.area;
    byArea.set(area, [...(byArea.get(area) ?? []), entry.reference]);
  }

  try {
    const resolved = await Promise.all([...byArea].map(([area, pageReferences]) =>
      resolvePhiWidgetInternalReferences({ runtime, area, pageReferences, assetIds: [] })));
    return new Map(resolved.flatMap((entry) => [...entry.pagePaths]));
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
