import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_GROUPS_RUNTIME_MODULE_ID } from "../../../plugins/runtime-modules/groups/ids";

const identity = {
  domain: "page",
  ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
  presetKey: "admin-groups-page",
} as const;

const appIdentity = {
  domain: "page",
  ownerModuleId: PHI_GROUPS_RUNTIME_MODULE_ID,
  presetKey: "app-groups-page",
} as const;

export const PHI_APP_GROUPS_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(appIdentity, [
  "widgetMyGroupsTable",
  "widgetMembersTable",
  "widgetMembershipForm",
  "widgetMembershipCommands",
]);

/** The two dialogs of the Groups administration Page: creating a group, adding a member. */
export const PHI_GROUPS_PAGE_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(identity, [
  "overlayCreate",
  "overlayMembership",
]);

export const PHI_GROUPS_PAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(identity, [
  "layoutCreate",
  "layoutCreateFooter",
  "layoutMembership",
  "layoutMembershipFooter",
]);

/**
 * Stable Widget ids for the Groups administration Page.
 *
 * The Controller has to name the membership table to send it a filter, so the id cannot be positional.
 */
export const PHI_GROUPS_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(identity, [
  "widgetGroupsTable",
  "widgetMembersTable",
  "widgetCreateForm",
  "widgetCreateCommands",
  "widgetMembershipForm",
  "widgetMembershipCommands",
]);
