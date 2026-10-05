"use client";

import { useMemo, type ReactNode } from "react";

import { resolvePhiBuilderSiderWidth } from "../builder-geometry";
import { hasPhiConfigFlag } from "../../../../helpers/flags";
import { PhiCmsFlags } from "../../../../constants/phi-cms";
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
      pageSiderRight: { visible: siderRight.rootNode != null, width: resolvePhiBuilderSiderWidth(siderRight) },
      structureSiderLeft: { visible: siderLeft.rootNode != null, width: resolvePhiBuilderSiderWidth(siderLeft), fullHeight: hasPhiConfigFlag(siderLeft.regionConfig, PhiCmsFlags.FullHeight) },
    };
  }, [area, builderMode, pageKey, regionDrafts]);
  return <PhiAuthoringRegionOverridesProvider value={value}>{children}</PhiAuthoringRegionOverridesProvider>;
}
