import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

const identity = {
  domain: "page",
  ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
  presetKey: "app-threads-page",
} as const;

/**
 * Stable Widget ids for the conversations Page.
 *
 * Every one of them names at least one of the others in a route, so none may be positional: the
 * listing tells the Controller what was chosen, the Controller tells the conversation and the composer,
 * and the composer asks the conversation to read itself again.
 */
export const PHI_APP_THREADS_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(identity, [
  "widgetInbox",
  "widgetConversation",
  "widgetComposer",
  "widgetNewForm",
  "widgetNewCommands",
]);

/** The dialog that holds the form, and the two Layouts it fills. */
export const PHI_APP_THREADS_PAGE_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(identity, ["overlayNew"]);

export const PHI_APP_THREADS_PAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(identity, [
  "layoutNew",
  "layoutNewFooter",
]);
