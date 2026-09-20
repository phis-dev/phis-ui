import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_APP_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/app/ids";
import { PHI_CMS_DEFAULT_SLOT_INDEX } from "../../../constants/cms-layout-types";
import { PhiCmsRegionType, PhiCmsStatus } from "../../../constants/phi-cms";
import { createPhiCmsPresetNodes } from "../../../helpers/cms-preset-nodes";
import { resolvePhiShellMetric } from "../../../helpers/shell-region-style";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../types/cms";
import type { PhiBlockRuntime } from "../../../types";
import { PHI_LAYOUT } from "../../../theme/phi-tokens";
import { PHI_SPACE } from "../../../theme/antd-css-var-contract";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../../plugins/runtime-modules/builder/runtime-module-defaults";

const SYNTHETIC_APP_REGION_IDS = {
  regionSiderLeft: -160,
} as const;

const SYNTHETIC_APP_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
  presetKey: "app-area-preset",
}, ["layoutSiderLeft"]);

const SYNTHETIC_APP_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_APP_RUNTIME_MODULE_ID,
  presetKey: "app-area-preset",
}, ["widgetSiderLeftNav"]);

/**
 * The App's own left sider, laid over the Site shell rather than replacing it.
 *
 * App shares its header and its footer with Public -- the same Brand, the same account trigger -- and
 * the one thing it does not share is a place for the Modules a signed-in person works with. This adds
 * that place and nothing else, so the Site shell stays the single description of everything above and
 * below it.
 *
 * The sider is where the Area's navigation belongs, and the reason is in SETTINGS.md section 3: a
 * shell Region outlives a move between Pages, while a Page-owned one is built again for each of them.
 * Navigation placed in the latter rebuilds itself under the hand that just used it.
 */
export async function buildPhiDefaultAppAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const shellSiderLeftOffsetTop = resolvePhiShellMetric(runtime.site.theme?.shell, "offsetTop", {
    family: "sider",
    region: "left",
  });
  const shellSiderLeftWidth = resolvePhiShellMetric(runtime.site.theme?.shell, "width", {
    family: "sider",
    region: "left",
  });
  const resolvedShellLeftWidth =
    typeof shellSiderLeftWidth === "number" ? shellSiderLeftWidth : PHI_LAYOUT.sidebarWidth;
  const nodes = createPhiCmsPresetNodes(page);

  return {
    page,
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("app"),
    overlays: [],
    regions: [{
      id: SYNTHETIC_APP_REGION_IDS.regionSiderLeft,
      pageId: page.id,
      areaPresetId: null,
      regionType: PhiCmsRegionType.SiderLeft,
      rootLayoutNodeId: SYNTHETIC_APP_LAYOUT_IDS.layoutSiderLeft,
      status: PhiCmsStatus.Published,
      flags: 0,
      visibilityMask: page.visibilityMask,
      // Between the header and the content, which is where it is read.
      sortOrder: 25,
      // Structure only: the frame's look is the Theme's (SHELL.md, Shell Chrome Overlay).
      config: {
        sticky: true,
        fullHeight: true,
        size: { width: `${resolvedShellLeftWidth}px` },
        ...(typeof shellSiderLeftOffsetTop === "number" ? { offsetTop: shellSiderLeftOffsetTop } : { offsetTop: 0 }),
        collapsible: true,
      },
    }],
    layoutNodes: [
      nodes.layout({
        creationPreset: { layoutKind: "verticalflex", preset: "panel" },
        typeKey: "flex-vertical",
        id: SYNTHETIC_APP_LAYOUT_IDS.layoutSiderLeft,
        parentLayoutNodeId: null,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "app sider left stack",
        config: {
          anchor: {
            horizontal: "center",
            vertical: "top",
          },
          gap: 0,
          padding: PHI_SPACE.xs,
          paddingTop: 0,
        },
      }),
    ],
    contentWidgets: [
      nodes.widget({
        typeKey: "sidebar-navigation",
        id: SYNTHETIC_APP_WIDGET_IDS.widgetSiderLeftNav,
        parentLayoutNodeId: SYNTHETIC_APP_LAYOUT_IDS.layoutSiderLeft,
        slotIndex: PHI_CMS_DEFAULT_SLOT_INDEX,
        sortOrder: 0,
        label: "app sider left navigation",
        config: {
          side: "left",
          width: resolvedShellLeftWidth,
          navKey: "app:sidebar",
        },
      }),
    ],
  };
}
