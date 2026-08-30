import "server-only";

import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import type { PhiResolvedCmsRenderableTree } from "../../../types/cms";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";
import {
  applyPhiBackgroundAssetProjection,
  resolvePhiBackgroundAssetProjection,
} from "../../../components/widgets/helpers/background-reference-resolver.server";
import { buildPhiDeveloperBuilderRegionDraftsFromTree } from "./region-hydration";

/**
 * The single entry point that turns a resolved tree into Builder Region drafts.
 *
 * It exists so the Background Asset projection cannot be forgotten at one of the call sites that used
 * to reach `buildPhiDeveloperBuilderRegionDraftsFromTree` directly. A draft without the delivery
 * revision makes the Editor cache a crop independently of Live, so after a focal change the two
 * disagree -- exactly what a browser check found on 2026-08-20.
 *
 * It resolves through the same bulk reference request the live render uses, which is the point: the
 * Editor and Live then compute byte-identical delivery URLs instead of merely similar ones.
 */
export async function buildPhiProjectedBuilderRegionDrafts<T extends PhiResolvedCmsRenderableTree>(
  runtime: Pick<PhiBlockRuntime, "site" | "phis">,
  tree: T,
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  regionKeys: readonly string[],
): Promise<Record<string, PhiDeveloperBuilderRegionDraft>> {
  const assets = await resolvePhiBackgroundAssetProjection({ runtime, trees: [tree] });

  return buildPhiDeveloperBuilderRegionDraftsFromTree(
    applyPhiBackgroundAssetProjection(tree, assets),
    area,
    pageKey,
    regionKeys as never,
  );
}
