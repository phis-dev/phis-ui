import { PHI_BUILDER_RUNTIME_MODULE_ID } from "./ids";
import { createPhiPresetCmsInstanceId, createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";

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

/**
 * The Area settings dialog the Shells workspace opens, and what stands in it.
 *
 * Its own map because it is a conversation about the Area rather than about the canvas: the root
 * route, the titles, and -- for Public, the only Area anything indexes -- whether the Area may be
 * found at all. All of it is one Form, so the controller reaches three addresses: the overlay to
 * open and close it, the Form to fill it and to ask it for what it holds, and the toolbar that asks.
 */
const AREA_SETTINGS_ID_CONTEXT = {
  domain: "page" as const,
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-area-preset",
};

export const PHI_BUILDER_AREA_SETTINGS_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  AREA_SETTINGS_ID_CONTEXT,
  ["overlayAreaSettings"],
);
export const PHI_BUILDER_AREA_SETTINGS_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  AREA_SETTINGS_ID_CONTEXT,
  ["areaSettingsBody", "areaSettingsFields", "areaSettingsFooter"],
);
export const PHI_BUILDER_AREA_SETTINGS_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  AREA_SETTINGS_ID_CONTEXT,
  ["areaSettingsAction", "areaSettingsForm", "areaSettingsCommands"],
);

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

/**
 * The dialog that asks where a Module's Public routes should answer.
 *
 * Its own address map rather than more keys in the Modules detail map, because it is a different
 * conversation: the detail overlay reads a Module, this one holds an unanswered question about one.
 */
export const PHI_BUILDER_PUBLIC_ROUTES_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["overlayPublicRoutes"],
);
export const PHI_BUILDER_PUBLIC_ROUTES_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["publicRoutesBody", "publicRoutesFooter"],
);
export const PHI_BUILDER_PUBLIC_ROUTES_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["publicRoutesIntro", "publicRoutesTable", "publicRoutesCommands"],
);

/** The dialog that says what switching a Module off stops drawing. */
export const PHI_BUILDER_MODULE_USAGE_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["overlayModuleUsage"],
);
export const PHI_BUILDER_MODULE_USAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["moduleUsageBody", "moduleUsageFooter"],
);
export const PHI_BUILDER_MODULE_USAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["moduleUsageIntro", "moduleUsageTable", "moduleUsageCommands"],
);

/** The Revisions page's one irreversible command: deleting an Area's own shell. */
export const PHI_BUILDER_DELETE_AREA_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["overlayDeleteArea"],
);
export const PHI_BUILDER_DELETE_AREA_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["deleteAreaBody", "deleteAreaFooter"],
);
export const PHI_BUILDER_DELETE_AREA_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  MODULES_DETAIL_ID_CONTEXT,
  ["deleteAreaWarning", "deleteAreaSurvives", "deleteAreaForm", "deleteAreaCommands"],
);

const PAGE_META_ID_CONTEXT = {
  domain: "page" as const,
  ownerModuleId: PHI_BUILDER_RUNTIME_MODULE_ID,
  presetKey: "builder-pages-preset",
};

export const PHI_BUILDER_PAGE_META_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(PAGE_META_ID_CONTEXT, ["editor"]);
export const PHI_BUILDER_PAGE_META_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(PAGE_META_ID_CONTEXT, ["body", "footer"]);
export const PHI_BUILDER_PAGE_META_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(PAGE_META_ID_CONTEXT, ["form", "commands"]);
