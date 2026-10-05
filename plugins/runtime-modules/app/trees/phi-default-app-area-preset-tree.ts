import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_APP_RUNTIME_MODULE_ID } from "../ids";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import { buildPhiAreaShellSiderLeftNodes } from "../../../../components/regions/presets/phi-area-shell-preset-nodes";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../area-module-defaults";

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
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page,
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("app"),
    overlays: [],
    ...buildPhiAreaShellSiderLeftNodes({
      nodes,
      runtime,
      labelPrefix: "app",
      navKey: "app:sidebar",
      ids: { ...SYNTHETIC_APP_REGION_IDS, ...SYNTHETIC_APP_LAYOUT_IDS, ...SYNTHETIC_APP_WIDGET_IDS },
    }),
  };
}
