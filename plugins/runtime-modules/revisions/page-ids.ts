import { PHI_REVISIONS_RUNTIME_MODULE_ID } from "./ids";
import { createPhiPresetCmsInstanceId, createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";

const PHI_REVISIONS_PAGE_PRESET_KEY = "builder-revisions-page";

const PHI_REVISIONS_PAGE_DIALOG_ID_CONTEXT = {
  domain: "page" as const,
  ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
  presetKey: PHI_REVISIONS_PAGE_PRESET_KEY,
};

/** The Page's own frame: the header bottom its one irreversible command stands in, and the content root. */
export const PHI_REVISIONS_PAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
  presetKey: PHI_REVISIONS_PAGE_PRESET_KEY,
}, ["layoutHeaderBottom", "layoutContent"]);

export const PHI_REVISIONS_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap({
  domain: "area",
  ownerModuleId: PHI_REVISIONS_RUNTIME_MODULE_ID,
  presetKey: PHI_REVISIONS_PAGE_PRESET_KEY,
}, ["widgetRevisionsAreaShellDelete"]);

/** The history table, which the Revisions Controller feeds its binding params back into. */
export const PHI_REVISIONS_TABLE_WIDGET_ID = createPhiPresetCmsInstanceId({
  ...PHI_REVISIONS_PAGE_DIALOG_ID_CONTEXT,
  nodeKey: "widgetRevisionsTable",
});

/** The Revisions page's one irreversible command: deleting an Area's own shell. */
export const PHI_REVISIONS_DELETE_AREA_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_REVISIONS_PAGE_DIALOG_ID_CONTEXT,
  ["overlayDeleteArea"],
);
export const PHI_REVISIONS_DELETE_AREA_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_REVISIONS_PAGE_DIALOG_ID_CONTEXT,
  ["deleteAreaBody", "deleteAreaFooter"],
);
export const PHI_REVISIONS_DELETE_AREA_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_REVISIONS_PAGE_DIALOG_ID_CONTEXT,
  ["deleteAreaWarning", "deleteAreaSurvives", "deleteAreaForm", "deleteAreaCommands"],
);
