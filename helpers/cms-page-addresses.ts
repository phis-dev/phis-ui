import { PHI_BUILDER_RUNTIME_MODULE_ID } from "../plugins/runtime-modules/builder/ids";
import { createPhiPresetCmsInstanceId, createPhiPresetCmsInstanceIdMap } from "../types/cms-instance-id";

export const PHI_BUILDER_REVISIONS_TABLE_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
  nodeKey: "widgetRevisionsTable",
});

export const PHI_BUILDER_MODULES_TABLE_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
  nodeKey: "widgetModulesTable",
});

const MODULES_DETAIL_ID_CONTEXT = {
  domain: "page" as const,
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
};

export const PHI_BUILDER_MODULE_DETAIL_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["overlayModuleDetail"],
);
export const PHI_BUILDER_MODULE_DETAIL_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["body"],
);
export const PHI_BUILDER_MODULE_DETAIL_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["fields"],
);

const PAGE_META_ID_CONTEXT = {
  domain: "page" as const,
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-pages-preset",
};

export const PHI_BUILDER_PAGE_META_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(PAGE_META_ID_CONTEXT, ["editor"]);
export const PHI_BUILDER_PAGE_META_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(PAGE_META_ID_CONTEXT, ["body", "footer"]);
export const PHI_BUILDER_PAGE_META_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(PAGE_META_ID_CONTEXT, ["form", "commands"]);
