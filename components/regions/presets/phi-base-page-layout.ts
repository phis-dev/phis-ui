import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { buildPhiCmsLayoutNode } from "../../../helpers/cms-node-factories";
import { PHI_CORE_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/core/ids";
import type { PhiCmsLayoutNode, PhiCmsPageNode, PhiCmsRegionNode } from "../../../types/cms";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";

/**
 * The shared content-region scaffold of the built-in page presets.
 *
 * Every built-in page roots its content region on the same vertical Layout node -- same background,
 * spacing and gaps everywhere -- and only fills its slots. The node's instance id is derived from
 * one fixed identity below rather than from the instantiating preset, so the id itself says "this is
 * the page scaffold" in whichever tree it appears: the Builder can recognise it, and an overridden
 * page's draft copy still carries it. That only stays sound while equal id means equal node, which
 * is why `assertPhiCmsPresetTreeContract` rejects any tree whose copy of this node deviates from the
 * canonical definition. A page that needs different chrome adds its own Layout node in a slot; it
 * never edits the scaffold.
 *
 * Bump {@link PHI_BASE_PAGE_LAYOUT_VERSION} when the canonical node changes: every preset built on
 * the scaffold folds it into its `presetVersion`, which is how overridden copies learn about the
 * update. The Settings pages (their own Collapsible shell) and the public/auth pages (landing
 * chrome, centered panels) do not use the scaffold yet.
 */

export const PHI_BASE_PAGE_LAYOUT_VERSION = 1;

export const PHI_BASE_PAGE_LAYOUT_NODE_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_CORE_RUNTIME_MODULE_ID,
  presetKey: "page-base-layout",
  nodeKey: "layoutContent",
});

export const PHI_BASE_PAGE_LAYOUT_LABEL = "Page content";

/** The canonical scaffold node; `visibilityMask` and `siteId` are the page's, everything else is fixed. */
export function buildPhiBasePageLayoutNode(page: PhiCmsPageNode): PhiCmsLayoutNode {
  return buildPhiCmsLayoutNode({
    id: PHI_BASE_PAGE_LAYOUT_NODE_ID,
    siteId: page.siteId,
    parentLayoutNodeId: null,
    creationPreset: { layoutKind: "verticalflex", preset: "page-base" },
    typeKey: "flex-vertical",
    slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
    sortOrder: 0,
    status: PhiCmsStatus.Published,
    flags: 0,
    visibilityMask: page.visibilityMask,
    label: PHI_BASE_PAGE_LAYOUT_LABEL,
  });
}

/**
 * Content region rooted on the scaffold. The region keeps its per-page identity and sizing --
 * `regionId` stays the preset's synthetic id, and `maxSize`/`margin` remain a per-page decision --
 * only the tree below the root is standardised.
 */
export function buildPhiBasePageContentScaffold({
  page,
  regionId,
  regionConfig,
}: {
  page: PhiCmsPageNode;
  regionId: number;
  regionConfig?: Record<string, unknown>;
}): { region: PhiCmsRegionNode; layoutNode: PhiCmsLayoutNode } {
  return {
    region: {
      id: regionId,
      pageId: page.id,
      areaPresetId: null,
      regionType: PhiCmsRegionType.Content,
      rootLayoutNodeId: PHI_BASE_PAGE_LAYOUT_NODE_ID,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      sortOrder: 30,
      config: regionConfig ?? {},
    },
    layoutNode: buildPhiBasePageLayoutNode(page),
  };
}
