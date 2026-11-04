"use client";

import { useMemo } from "react";

import {
  PhiDeveloperBuilderStructureCanvas,
  type PhiDeveloperBuilderStructureCanvasProps,
} from "./structure-canvas";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import { usePhiBuilderRegionDraftHydration } from "./use-region-draft-hydration";
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
  const area = usePhiDeveloperBuilderStateValue((state) => state.area);
  const pageKey = usePhiDeveloperBuilderStateValue((state) => state.pageKey);
  const builderMode = usePhiDeveloperBuilderStateValue((state) => state.builderMode);
  const builderModuleMetas = usePhiBuilderModuleMetas(targetArea);
  const pickItems = useMemo(
    () => buildPhiStructureRegionPickItems(builderModuleMetas.plugins),
    [builderModuleMetas.plugins],
  );
  const isStructureWorkspace = workspace === "structure";
  const isPagesWorkspace = workspace === "pages";

  const hydrationDraftKeys = useMemo(() => (
    isStructureWorkspace
      ? PHI_BUILDER_SHELL_REGION_KEYS.map((regionKey) => getPhiBuilderRegionDraftKey(area, regionKey, pageKey))
      : isPagesWorkspace
        ? PHI_BUILDER_PAGE_REGION_KEYS.map((regionKey) => getPhiBuilderRegionDraftKey(area, regionKey, pageKey))
        : []
  ), [area, isPagesWorkspace, isStructureWorkspace, pageKey]);
  usePhiBuilderRegionDraftHydration({
    draftKeys: hydrationDraftKeys,
    serverDrafts: isStructureWorkspace
      ? structureShellDraftsByArea?.[area]
      : isPagesWorkspace
        ? pageDraftsByScope?.[area]?.[pageKey] ?? undefined
        : undefined,
    builderMode,
    previewRegionDrafts: isStructureWorkspace || isPagesWorkspace ? previewRegionDrafts : null,
  });

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
