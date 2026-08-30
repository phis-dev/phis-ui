"use client";

import { useEffect } from "react";

import { PhiDeveloperBuilderCanvasWidgetClient } from "./canvas-widget";
import type { PhiDeveloperBuilderStructureCanvasProps } from "./structure-canvas";
import type { PhiBuilderPageDraftsMapByScope, PhiBuilderPageMeta } from "../page-presets.server";
import type { PhiBuilderPreviewRegionDraft } from "../preview-transport";
import { getPhiBuilderRegionDraftKey } from "../region-keys";
import {
  mergePhiDeveloperDeletedPageDrafts,
  mergePhiDeveloperPageMetaDrafts,
  mergePhiDeveloperPagePresetDrafts,
} from "../developer-workspace-store";
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
  useEffect(() => {
    mergePhiDeveloperPagePresetDrafts(pagePresetDrafts);
  }, [pagePresetDrafts]);

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
