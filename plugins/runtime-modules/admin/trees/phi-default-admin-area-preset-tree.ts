import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_ADMIN_RUNTIME_MODULE_ID } from "../ids";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import {
  buildPhiAreaShellHeaderNodes,
  buildPhiAreaShellSiderLeftNodes,
  concatPhiAreaShellPresetNodes,
} from "../../../../components/regions/presets/phi-area-shell-preset-nodes";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../area-module-defaults";

const SYNTHETIC_ADMIN_REGION_IDS = {
  regionHeaderTop: -126,
  regionHeaderMain: -127,
  regionSiderLeft: -130,
} as const;

const SYNTHETIC_ADMIN_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  presetKey: "admin-area-preset",
}, [
  "layoutHeaderTop",
  "layoutHeaderTopActions",
  "layoutHeaderMain",
  "layoutSiderLeft",
]);

const SYNTHETIC_ADMIN_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ADMIN_RUNTIME_MODULE_ID,
  presetKey: "admin-area-preset",
}, [
  "widgetSiderLeftNav",
  "widgetHeaderTopAccount",
  "widgetHeaderMainPageTitle",
]);

export async function buildPhiDefaultAdminAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page(),
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("admin"),
    overlays: [],
    ...concatPhiAreaShellPresetNodes(
      buildPhiAreaShellHeaderNodes({
        nodes,
        runtime,
        labelPrefix: "admin",
        ids: { ...SYNTHETIC_ADMIN_REGION_IDS, ...SYNTHETIC_ADMIN_LAYOUT_IDS, ...SYNTHETIC_ADMIN_WIDGET_IDS },
      }),
      buildPhiAreaShellSiderLeftNodes({
        nodes,
        runtime,
        labelPrefix: "admin",
        navKey: "admin:sidebar",
        ids: { ...SYNTHETIC_ADMIN_REGION_IDS, ...SYNTHETIC_ADMIN_LAYOUT_IDS, ...SYNTHETIC_ADMIN_WIDGET_IDS },
      }),
    ),
  };
}
