"use client";

import { useMemo, type ReactNode } from "react";

import { resolvePhiCssLength } from "../../../../helpers/css-length";
import { PHI_LAYOUT } from "../../../../theme/phi-tokens";
import { PhiAuthoringRegionOverridesProvider } from "../../../../components/runtime/authoring-region-overrides";
import { getDefaultRegionDraft, resolveRegionDraftKey } from "../developer-region-drafts";
import { usePhiDeveloperBuilderStateValue, usePhiDeveloperRegionDrafts } from "../developer-workspace-store";

export function PhiBuilderCanvasRegionOverrides({ children }: { children: ReactNode }) {
  const builderMode = usePhiDeveloperBuilderStateValue("public", (state) => state.builderMode);
  const area = usePhiDeveloperBuilderStateValue("public", (state) => state.area);
  const pageKey = usePhiDeveloperBuilderStateValue("public", (state) => state.pageKey);
  const regionDrafts = usePhiDeveloperRegionDrafts();
  const value = useMemo(() => {
    const siderRight = resolveRegionDraftKey(regionDrafts, area, "sider_right", pageKey) ?? getDefaultRegionDraft("sider_right");
    const siderLeft = resolveRegionDraftKey(regionDrafts, area, "sider_left", pageKey) ?? getDefaultRegionDraft("sider_left");
    return {
      preview: builderMode === "preview",
      pageSiderRight: { visible: siderRight.rootNodeTypeKey != null, width: resolvePhiCssLength(siderRight.size?.width ?? siderRight.minSize?.width ?? PHI_LAYOUT.sidebarWidth) ?? `${PHI_LAYOUT.sidebarWidth}px` },
      structureSiderLeft: { visible: siderLeft.rootNodeTypeKey != null, width: resolvePhiCssLength(siderLeft.size?.width ?? siderLeft.minSize?.width ?? PHI_LAYOUT.sidebarWidth) ?? `${PHI_LAYOUT.sidebarWidth}px`, fullHeight: siderLeft.regionConfig?.fullHeight === true },
    };
  }, [area, builderMode, pageKey, regionDrafts]);
  return <PhiAuthoringRegionOverridesProvider value={value}>{children}</PhiAuthoringRegionOverridesProvider>;
}
