import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/user-management/ids";

const USER_MANAGEMENT_PAGE_PRESET = {
  domain: "page",
  ownerModuleId: PHI_USER_MANAGEMENT_RUNTIME_MODULE_ID,
  presetKey: "admin-users-page",
} as const;

export const PHI_USER_MANAGEMENT_PAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  USER_MANAGEMENT_PAGE_PRESET,
  ["layoutContent", "layoutCreate", "layoutCreateFooter", "layoutEdit", "layoutEditFooter", "layoutHistory"],
);

export const PHI_USER_MANAGEMENT_PAGE_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  USER_MANAGEMENT_PAGE_PRESET,
  ["overlayCreate", "overlayEdit", "overlayHistory"],
);

export const PHI_USER_MANAGEMENT_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  USER_MANAGEMENT_PAGE_PRESET,
  [
    "widgetTable",
    "widgetCreateForm",
    "widgetCreateCommands",
    "widgetEditForm",
    "widgetEditCommands",
    "widgetHistoryTable",
  ],
);
