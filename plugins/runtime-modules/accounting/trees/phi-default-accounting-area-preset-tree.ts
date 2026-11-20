import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_ACCOUNTING_RUNTIME_MODULE_ID } from "../ids";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import {
  buildPhiAreaShellHeaderNodes,
  buildPhiAreaShellSiderLeftNodes,
  concatPhiAreaShellPresetNodes,
} from "../../../../components/regions/presets/phi-area-shell-preset-nodes";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";

/*
 * The staff shell, as Admin's: the header bar with the Page title as a caption, the Tour button and the
 * Account, and the sidebar on `accounting:sidebar`, composed over the Site's shell in `../presets.ts`.
 * Ids of its own, so an Accounting shell never shares a node with another Area's.
 */
const SYNTHETIC_ACCOUNTING_REGION_IDS = {
  regionHeaderTop: -170,
  regionSiderLeft: -180,
} as const;

const SYNTHETIC_ACCOUNTING_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  presetKey: "accounting-area-preset",
}, [
  "layoutHeaderTop",
  "layoutHeaderTopActions",
  "layoutSiderLeft",
]);

const SYNTHETIC_ACCOUNTING_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  presetKey: "accounting-area-preset",
}, [
  "widgetSiderLeftNav",
  "widgetHeaderTopAccount",
  "widgetHeaderTopPageTitle",
  "widgetHeaderTopTourButton",
]);

export async function buildPhiDefaultAccountingAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  return {
    page: nodes.page(),
    overlays: [],
    ...concatPhiAreaShellPresetNodes(
      buildPhiAreaShellHeaderNodes({
        nodes,
        runtime,
        labelPrefix: "accounting",
        ids: { ...SYNTHETIC_ACCOUNTING_REGION_IDS, ...SYNTHETIC_ACCOUNTING_LAYOUT_IDS, ...SYNTHETIC_ACCOUNTING_WIDGET_IDS },
      }),
      buildPhiAreaShellSiderLeftNodes({
        nodes,
        runtime,
        labelPrefix: "accounting",
        navKey: "accounting:sidebar",
        ids: { ...SYNTHETIC_ACCOUNTING_REGION_IDS, ...SYNTHETIC_ACCOUNTING_LAYOUT_IDS, ...SYNTHETIC_ACCOUNTING_WIDGET_IDS },
      }),
    ),
  };
}
