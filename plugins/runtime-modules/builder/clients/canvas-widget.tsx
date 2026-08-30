"use client";

import { useEffect, useMemo } from "react";

import {
  PhiDeveloperBuilderStructureCanvas,
  type PhiDeveloperBuilderStructureCanvasProps,
} from "./structure-canvas";
import {
  mergePhiDeveloperRegionDrafts,
  usePhiDeveloperBuilderStateValue,
  usePhiDeveloperRegionDrafts,
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
  const regionDrafts = usePhiDeveloperRegionDrafts();
  const builderModuleMetas = usePhiBuilderModuleMetas(targetArea);
  const pickItems = useMemo(
    () => buildPhiStructureRegionPickItems(builderModuleMetas.plugins),
    [builderModuleMetas.plugins],
  );
  const isStructureWorkspace = workspace === "structure";
  const isPagesWorkspace = workspace === "pages";

  useEffect(() => {
    if (!isStructureWorkspace && !isPagesWorkspace) {
      return;
    }

    if (builderMode === "preview" && previewRegionDrafts && Object.keys(previewRegionDrafts).length > 0) {
      mergePhiDeveloperRegionDrafts(previewRegionDrafts as Record<string, PhiDeveloperBuilderRegionDraft>);
    }

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

  }, [
    isPagesWorkspace,
    isStructureWorkspace,
    pageDraftsByScope,
    previewRegionDrafts,
    regionDrafts,
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
        regionDrafts={regionDrafts}
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
        regionDrafts={regionDrafts}
        serverPreviewRegions={serverPreviewRegions}
        pickItems={pickItems}
        regionLabels={regionLabels}
        pickerLabels={pickerLabels}
      />
    );
  }

  return null;
}
