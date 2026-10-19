import { createPhiPresetCmsInstanceIdMap } from "../../../../types/cms-instance-id";
import { PHI_EDITOR_RUNTIME_MODULE_ID } from "../ids";
import { createPhiCmsPresetNodes } from "../../../../helpers/cms-preset-nodes";
import {
  buildPhiAreaShellHeaderNodes,
  buildPhiAreaShellSiderLeftNodes,
  concatPhiAreaShellPresetNodes,
} from "../../../../components/regions/presets/phi-area-shell-preset-nodes";
import type { PhiResolvedCmsPageTree, PhiCmsPageNode } from "../../../../types/cms";
import type { PhiBlockRuntime } from "../../../../types";
import { createPhiDefaultAreaRuntimeModuleIds } from "../../area-module-defaults";

const SYNTHETIC_EDITOR_REGION_IDS = {
  regionHeaderTop: -140,
  regionSiderLeft: -150,
} as const;

const SYNTHETIC_EDITOR_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
}, [
  "layoutHeaderTop",
  "layoutHeaderTopActions",
  "layoutSiderLeft",
]);

const SYNTHETIC_EDITOR_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_EDITOR_RUNTIME_MODULE_ID,
  presetKey: "editor-area-preset",
}, [
  "widgetHeaderTopPageTitle",
  "widgetHeaderTopTourButton",
  "widgetHeaderTopAccount",
  "widgetSiderLeftNav",
]);

export async function buildPhiDefaultEditorAreaPresetTree({
  page,
  runtime,
}: {
  page: PhiCmsPageNode;
  runtime: PhiBlockRuntime;
}): Promise<PhiResolvedCmsPageTree> {
  const nodes = createPhiCmsPresetNodes(page);
  const ids = { ...SYNTHETIC_EDITOR_REGION_IDS, ...SYNTHETIC_EDITOR_LAYOUT_IDS, ...SYNTHETIC_EDITOR_WIDGET_IDS };
  return {
    page,
    runtimeModuleIds: createPhiDefaultAreaRuntimeModuleIds("editor"),
    overlays: [],
    ...concatPhiAreaShellPresetNodes(
      buildPhiAreaShellHeaderNodes({ nodes, runtime, labelPrefix: "editor", ids }),
      buildPhiAreaShellSiderLeftNodes({
        nodes,
        runtime,
        labelPrefix: "editor",
        // The entries come from the navigation behind `navKey`, as in every other Area.
        navKey: "editor:sidebar",
        ids,
      }),
    ),
  };
}
