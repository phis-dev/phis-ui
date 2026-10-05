"use client";

import { useCallback, useEffect, useMemo } from "react";

import {
  PhiDeveloperBuilderStructureCanvas,
  type PhiDeveloperBuilderStructureCanvasProps,
} from "./structure-canvas";
import {
  getPhiDeveloperRegionDraftsSnapshot,
  mergePhiDeveloperRegionDrafts,
  usePhiDeveloperBuilderStateValue,
  usePhiDeveloperRegionDraftsValue,
} from "../developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
} from "../developer-workspace-types";
import {
  getPhiBuilderRegionDraftKey,
  PHI_BUILDER_PAGE_REGION_KEYS,
  PHI_BUILDER_SHELL_REGION_KEYS,
} from "../region-keys";
import type { PhiBuilderPageDraftsMapByScope } from "../page-presets.server";
import type { PhiBuilderPreviewRegionDraft } from "../preview-transport";
import type { PhiShellRegionTheme } from "../../../../helpers/shell-region-style";
import { usePhiBuilderModuleMetas } from "../plugin-meta-store";
import { buildPhiStructureRegionPickItems } from "../structure-region-pick-items";
import type { PhiBuilderChromeWidgetLabels } from "../../../../components/widgets/label-types/builder-chrome";
import type { PhiRegionWidgetLabels } from "../../../../components/widgets/label-types/region";

type PhiDeveloperBuilderCanvasWidgetClientProps = {
  workspace: "structure" | "pages";
  serverPreviewRegions?: PhiDeveloperBuilderStructureCanvasProps["serverPreviewRegions"];
  structureShellDraftsByArea?: Partial<Record<PhiDeveloperBuilderArea, Record<string, PhiDeveloperBuilderRegionDraft>>>;
  pageDraftsByScope?: PhiBuilderPageDraftsMapByScope;
  previewRegionDrafts?: Record<string, PhiBuilderPreviewRegionDraft> | null;
  shellTheme?: PhiShellRegionTheme;
  disabled?: boolean;
  targetArea: PhiDeveloperBuilderArea;
  regionLabels?: PhiRegionWidgetLabels;
  pickerLabels?: PhiBuilderChromeWidgetLabels["canvas"]["picker"];
};

export function PhiDeveloperBuilderCanvasWidgetClient({
  workspace,
  serverPreviewRegions,
  structureShellDraftsByArea,
  pageDraftsByScope,
  previewRegionDrafts = null,
  shellTheme,
  disabled: _disabled = false,
  targetArea,
  regionLabels,
  pickerLabels,
}: PhiDeveloperBuilderCanvasWidgetClientProps) {
  void _disabled;
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const pageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const builderMode = usePhiDeveloperBuilderStateValue("public", (state) => state.builderMode);
  const builderModuleMetas = usePhiBuilderModuleMetas(targetArea);
  const pickItems = useMemo(
    () => buildPhiStructureRegionPickItems(builderModuleMetas.plugins),
    [builderModuleMetas.plugins],
  );
  const isStructureWorkspace = workspace === "structure";
  const isPagesWorkspace = workspace === "pages";

  /*
   * Which of this workspace's drafts are not in the store, as one string. The Canvas used to subscribe
   * to the whole draft map for this question, so every write to any draft re-rendered it and, below it,
   * every Region scaffold on the canvas with its whole tree. The Regions read their own draft now
   * (`structure-canvas.tsx`); this widget renders when the set of missing drafts changes and not before.
   */
  const hydrationDraftKeys = useMemo(() => (
    isStructureWorkspace
      ? PHI_BUILDER_SHELL_REGION_KEYS.map((regionKey) => getPhiBuilderRegionDraftKey(area, regionKey, pageKey))
      : isPagesWorkspace
        ? PHI_BUILDER_PAGE_REGION_KEYS.map((regionKey) => getPhiBuilderRegionDraftKey(area, regionKey, pageKey))
        : []
  ), [area, isPagesWorkspace, isStructureWorkspace, pageKey]);
  const missingDraftKeys = usePhiDeveloperRegionDraftsValue(useCallback(
    (drafts: Record<string, PhiDeveloperBuilderRegionDraft>) =>
      hydrationDraftKeys.filter((draftKey) => drafts[draftKey] == null).join("\u0000"),
    [hydrationDraftKeys],
  ));

  useEffect(() => {
    if (!isStructureWorkspace && !isPagesWorkspace) {
      return;
    }

    if (builderMode === "preview" && previewRegionDrafts && Object.keys(previewRegionDrafts).length > 0) {
      mergePhiDeveloperRegionDrafts(previewRegionDrafts as Record<string, PhiDeveloperBuilderRegionDraft>);
    }

    const regionDrafts = getPhiDeveloperRegionDraftsSnapshot();
    const shellDraftKeys = PHI_BUILDER_SHELL_REGION_KEYS
      .map((regionKey) => getPhiBuilderRegionDraftKey(area, regionKey, pageKey));
    const pageDraftKeys = PHI_BUILDER_PAGE_REGION_KEYS
      .map((regionKey) => getPhiBuilderRegionDraftKey(area, regionKey, pageKey));
    const needsShellHydration = isStructureWorkspace && shellDraftKeys.some((draftKey) => regionDrafts[draftKey] == null);
    const needsPageHydration =
      isPagesWorkspace &&
      pageDraftKeys.some((draftKey) => regionDrafts[draftKey] == null);

    if (needsShellHydration) {
      const nextShellDrafts = structureShellDraftsByArea?.[area] ?? {};
      const missingShellDrafts = Object.fromEntries(
        Object.entries(nextShellDrafts).filter(([draftKey]) => regionDrafts[draftKey] == null),
      );
      if (Object.keys(missingShellDrafts).length > 0) {
        mergePhiDeveloperRegionDrafts(missingShellDrafts);
      }
    }

    if (!needsPageHydration) {
      return;
    }

    const nextPageDrafts = pageDraftsByScope?.[area]?.[pageKey] ?? {};
    const missingPageDrafts = Object.fromEntries(
      Object.entries(nextPageDrafts).filter(([draftKey]) => regionDrafts[draftKey] == null),
    );
    if (Object.keys(missingPageDrafts).length > 0) {
      mergePhiDeveloperRegionDrafts(missingPageDrafts);
      return;
    }

    // `missingDraftKeys` is the reason to run again; the snapshot inside is what is read.
  }, [
    isPagesWorkspace,
    isStructureWorkspace,
    missingDraftKeys,
    pageDraftsByScope,
    previewRegionDrafts,
    area,
    builderMode,
    pageKey,
    structureShellDraftsByArea,
  ]);

  if (isStructureWorkspace) {
    return (
      <PhiDeveloperBuilderStructureCanvas
        workspace="structure"
        builderMode={builderMode}
        area={area}
        pageKey={pageKey}
        shellTheme={shellTheme}
        pageDraftsByScope={pageDraftsByScope}
        serverPreviewRegions={serverPreviewRegions}
        pickItems={pickItems}
        regionLabels={regionLabels}
        pickerLabels={pickerLabels}
      />
    );
  }

  if (isPagesWorkspace) {
    return (
      <PhiDeveloperBuilderStructureCanvas
        workspace="pages"
        builderMode={builderMode}
        area={area}
        pageKey={pageKey}
        shellTheme={shellTheme}
        serverPreviewRegions={serverPreviewRegions}
        pickItems={pickItems}
        regionLabels={regionLabels}
        pickerLabels={pickerLabels}
      />
    );
  }

  return null;
}
