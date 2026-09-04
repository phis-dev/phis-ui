"use client";

import { useEffect, useMemo, useRef } from "react";

import { PhiStructureRegionLayout } from "../../../../components/layouts/phi-structure-region-layout";
import type { PhiDeveloperBuilderStructureCanvasProps } from "./structure-canvas";
import {
  mergePhiDeveloperRegionDrafts,
  usePhiDeveloperBuilderStateValue,
  usePhiDeveloperRegionDrafts,
} from "../developer-workspace-store";
import type {
  PhiDeveloperBuilderArea,
  PhiDeveloperBuilderRegionDraft,
} from "../developer-workspace-types";
import type { PhiBuilderPageDraftsMapByScope } from "../page-presets.server";
import type { PhiBuilderPreviewRegionDraft } from "../preview-transport";
import type { PhiShellRegionTheme } from "../../../../helpers/shell-region-style";
import {
  getPhiBuilderRegionDraftKey,
  PHI_BUILDER_SHELL_REGION_KEYS,
} from "../region-keys";
import { usePhiBuilderModuleMetas } from "../plugin-meta-store";
import { buildPhiStructureRegionPickItems } from "../structure-region-pick-items";
import { PhiStructureDndProvider } from "../structure-dnd";
import {
  PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
  type PhiBuilderChromeWidgetLabels,
} from "../../../../components/widgets/label-types/builder-chrome";
import {
  PHI_REGION_WIDGET_DEFAULT_LABELS,
  type PhiRegionWidgetLabels,
} from "../../../../components/widgets/label-types/region";
import { PhiStructureRegionScaffold } from "../widgets/structure-region/built-in";
import { PhiBuilderAreaRootRouteControl } from "./area-root-route-control";
import type { PhiAreaRootRoute } from "../../../../helpers/cms-area-config";

export function PhiDeveloperBuilderShellsWorkspaceWidgetClient({
  serverPreviewRegions,
  structureShellDrafts,
  pageDraftsByScope: _pageDraftsByScope,
  previewRegionDrafts = null,
  shellTheme: _shellTheme,
  disabled: _disabled = false,
  targetArea,
  rootRoute = null,
  regionLabels = PHI_REGION_WIDGET_DEFAULT_LABELS,
  pickerLabels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.canvas.picker,
  rootRouteLabels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS.rootRoute,
}: {
  serverPreviewRegions?: PhiDeveloperBuilderStructureCanvasProps["serverPreviewRegions"];
  structureShellDrafts?: Record<string, PhiDeveloperBuilderRegionDraft>;
  pageDraftsByScope?: PhiBuilderPageDraftsMapByScope;
  previewRegionDrafts?: Record<string, PhiBuilderPreviewRegionDraft> | null;
  shellTheme?: PhiShellRegionTheme;
  disabled?: boolean;
  targetArea: PhiDeveloperBuilderArea;
  rootRoute?: PhiAreaRootRoute | null;
  regionLabels?: PhiRegionWidgetLabels;
  pickerLabels?: PhiBuilderChromeWidgetLabels["canvas"]["picker"];
  rootRouteLabels?: PhiBuilderChromeWidgetLabels["rootRoute"];
}) {
  void _pageDraftsByScope;
  void _shellTheme;
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const pageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const builderMode = usePhiDeveloperBuilderStateValue("public", (state) => state.builderMode);
  const regionDrafts = usePhiDeveloperRegionDrafts();
  const builderModuleMetas = usePhiBuilderModuleMetas(targetArea);
  const pickItems = useMemo(
    () => buildPhiStructureRegionPickItems(builderModuleMetas.plugins),
    [builderModuleMetas.plugins],
  );
  const hydratedAreaRef = useRef<PhiDeveloperBuilderArea | null>(null);

  useEffect(() => {
    if (builderMode === "preview" && previewRegionDrafts && Object.keys(previewRegionDrafts).length > 0) {
      mergePhiDeveloperRegionDrafts(previewRegionDrafts as Record<string, PhiDeveloperBuilderRegionDraft>);
    }

    if (hydratedAreaRef.current !== area) {
      hydratedAreaRef.current = area;
      const nextAreaShellDrafts = structureShellDrafts ?? {};
      if (Object.keys(nextAreaShellDrafts).length > 0) {
        mergePhiDeveloperRegionDrafts(nextAreaShellDrafts);
        return;
      }
    }

    const shellDraftKeys = PHI_BUILDER_SHELL_REGION_KEYS.map((regionKey) =>
      getPhiBuilderRegionDraftKey(area, regionKey, pageKey),
    );
    const needsShellHydration = shellDraftKeys.some((draftKey) => regionDrafts[draftKey] == null);

    if (!needsShellHydration) {
      return;
    }

    const nextShellDrafts = structureShellDrafts ?? {};
    const missingShellDrafts = Object.fromEntries(
      Object.entries(nextShellDrafts).filter(([draftKey]) => regionDrafts[draftKey] == null),
    );

    if (Object.keys(missingShellDrafts).length > 0) {
      mergePhiDeveloperRegionDrafts(missingShellDrafts);
    }
  }, [area, builderMode, pageKey, previewRegionDrafts, regionDrafts, structureShellDrafts]);

  const renderStructureRegion = (
    regionKey: "header_top" | "header_main" | "sider_left" | "footer_main" | "footer_bottom",
    title: string,
    subtitle?: string | null,
  ) => {
    const fallbackDraft = structureShellDrafts?.[getPhiBuilderRegionDraftKey(area, regionKey, pageKey)] ?? null;

    return (
      <PhiStructureRegionScaffold
        key={regionKey}
        config={{
          slotKind: "structure",
          regionKey,
          title,
          subtitle: subtitle ?? null,
          allowSelect: true,
          allowInsert: true,
          pickItems: [...pickItems],
          fallbackMinHeight: regionKey === "footer_main" || regionKey === "footer_bottom" ? 0 : undefined,
        }}
        structureDraftsByArea={{
          [area]: fallbackDraft,
        }}
        serverPreview={serverPreviewRegions?.[regionKey] ?? null}
        pickerLabels={pickerLabels}
        containerClassName="phi-builder-workspace-region-scaffold"
      />
    );
  };

  return (
    <PhiStructureDndProvider>
      <div style={{
        minWidth: 0,
        width: "100%",
        minHeight: 0,
        flex: "1 1 auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ padding: "8px 12px" }}>
          <PhiBuilderAreaRootRouteControl
            targetArea={targetArea}
            persistedRootRoute={rootRoute}
            disabled={_disabled}
            labels={rootRouteLabels}
          />
        </div>
        <PhiStructureRegionLayout
        labels={regionLabels}
        headerTop={renderStructureRegion("header_top", regionLabels.regions.headerTop.title)}
        headerMain={renderStructureRegion("header_main", regionLabels.regions.headerMain.title)}
        siderLeft={renderStructureRegion(
          "sider_left",
          regionLabels.regions.siderLeft.title,
          regionLabels.structure.surface.siderFullHeight,
        )}
        footerMain={renderStructureRegion("footer_main", regionLabels.regions.footerMain.title)}
        footerBottom={renderStructureRegion("footer_bottom", regionLabels.regions.footerBottom.title)}
        style={{
          minWidth: 0,
          width: "100%",
          minHeight: 0,
          height: "100%",
          padding: 0,
          background: "var(--ant-color-fill-secondary)",
        }}
        />
      </div>
    </PhiStructureDndProvider>
  );
}
