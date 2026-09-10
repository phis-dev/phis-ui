"use client";

import { useEffect, useMemo } from "react";

import { PhiDeveloperBuilderCanvasWidgetClient } from "./canvas-widget";
import type { PhiDeveloperBuilderStructureCanvasProps } from "./structure-canvas";
import type { PhiBuilderPageDraftsMapByScope, PhiBuilderPageMeta } from "../page-presets.server";
import type { PhiBuilderPreviewRegionDraft } from "../preview-transport";
import { getPhiBuilderRegionDraftKey } from "../region-keys";
import {
  mergePhiDeveloperDeletedPageDrafts,
  mergePhiDeveloperPageMetaDrafts,
  mergePhiDeveloperPagePresetDrafts,
  usePhiDeveloperBuilderStateValue,
} from "../developer-workspace-store";
import { isPhiBuilderConstructedRootPage } from "../offered-page-catalog";
import { buildPhiDeveloperBuilderRegionDraftsFromTree } from "../region-hydration";
import { PHI_BUILDER_PAGE_REGION_KEYS } from "../region-keys";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
} from "../developer-workspace-types";
import type { PhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-types/builder-chrome";
import type { PhiRegionWidgetLabels } from "../../../../components/widgets/label-types/region";

export function PhiDeveloperBuilderPagesWorkspaceWidgetClient({
  pageDraftsByScope,
  pagePresetDrafts,
  pageMeta,
  pageMetaArea,
  pageMetaPageKey,
  serverPreviewRegions,
  previewRegionDrafts = null,
  regionLabels,
  pickerLabels,
}: {
  pageDraftsByScope?: PhiBuilderPageDraftsMapByScope;
  pagePresetDrafts: Record<string, PhiDeveloperBuilderRegionDraft>;
  pageMeta?: PhiBuilderPageMeta;
  pageMetaArea: PhiDeveloperBuilderArea;
  pageMetaPageKey: string;
  serverPreviewRegions?: PhiDeveloperBuilderStructureCanvasProps["serverPreviewRegions"];
  previewRegionDrafts?: Record<string, PhiBuilderPreviewRegionDraft> | null;
  regionLabels?: PhiRegionWidgetLabels;
  pickerLabels?: PhiBuilderChromeWidgetLabels["canvas"]["picker"];
}) {
  /*
   * A root the Builder constructs starts empty, the way a Page somebody just created does.
   *
   * The seed the server sends is the tree of whatever Preset currently answers `/` -- the Area's own
   * Page, when the landing is answered with nobody. Copying that into the drafts would mean "make your
   * own landing" opens on somebody else's, so this replaces it with the same projection run over an
   * empty tree: one draft per Page region, each with nothing in it.
   *
   * Empty drafts rather than no drafts, because the merge below is a merge: leaving the keys out would
   * let the Preset's regions stand from before the Builder answered.
   */
  const constructedRoot = usePhiDeveloperBuilderStateValue("public", (state) =>
    isPhiBuilderConstructedRootPage(state, pageMetaArea, pageMetaPageKey));
  const emptyPresetDrafts = useMemo(
    () => buildPhiDeveloperBuilderRegionDraftsFromTree(
      { regions: [], layoutNodes: [], contentWidgets: [] },
      pageMetaArea,
      pageMetaPageKey,
      PHI_BUILDER_PAGE_REGION_KEYS,
    ),
    [pageMetaArea, pageMetaPageKey],
  );

  useEffect(() => {
    mergePhiDeveloperPagePresetDrafts(constructedRoot ? emptyPresetDrafts : pagePresetDrafts);
  }, [constructedRoot, emptyPresetDrafts, pagePresetDrafts]);

  useEffect(() => {
    mergePhiDeveloperPageMetaDrafts(pageMetaArea, {
      [getPhiBuilderRegionDraftKey(pageMetaArea, "page_meta", pageMetaPageKey)]: {
        title: pageMeta?.title ?? null,
        description: pageMeta?.description ?? null,
      },
    });
    mergePhiDeveloperDeletedPageDrafts(pageMetaArea, {
      [getPhiBuilderRegionDraftKey(pageMetaArea, "page_delete", pageMetaPageKey)]: pageMeta?.isDeleted === true,
    });
  }, [pageMeta?.description, pageMeta?.isDeleted, pageMeta?.title, pageMetaArea, pageMetaPageKey]);

  return (
    <div style={{ minWidth: 0, width: "100%", minHeight: 0, flex: "1 1 auto" }}>
      <PhiDeveloperBuilderCanvasWidgetClient
        workspace="pages"
        pageDraftsByScope={pageDraftsByScope}
        serverPreviewRegions={serverPreviewRegions}
        previewRegionDrafts={previewRegionDrafts}
        targetArea={pageMetaArea}
        regionLabels={regionLabels}
        pickerLabels={pickerLabels}
      />
    </div>
  );
}
