import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";
import type { PhiSidebarAreaKey } from "../sidebar-route";
import { PHI_THREADS_RUNTIME_MODULE_ID } from "./ids";

/** The conversations Page of one Area, by its preset key: `<area>-threads-page`. */
export function getPhiThreadsPagePresetKey(area: PhiSidebarAreaKey) {
  return `${area}-threads-page` as const;
}

/**
 * Stable instance ids for one Area's conversations Page.
 *
 * Every Widget names at least one of the others in a route, so none may be positional: the listing tells
 * the Controller what was chosen, the Controller tells the conversation and the composer, and the
 * composer asks the conversation to read itself again. Each Area's Page has its own, because an id
 * belongs to one preset.
 *
 * Only the preset reads these. The Controller used to as well, which made it a second owner of this
 * Page's arrangement; it takes its receivers from its own settings now, and the Page writes both
 * directions of the wiring in one place.
 */
export function createPhiThreadsPageIds(area: PhiSidebarAreaKey) {
  const identity = {
    domain: "page",
    ownerModuleId: PHI_THREADS_RUNTIME_MODULE_ID,
    presetKey: getPhiThreadsPagePresetKey(area),
  } as const;
  return {
    widgets: createPhiPresetCmsInstanceIdMap(identity, [
      "widgetInbox",
      "widgetConversation",
      "widgetReplyForm",
      "widgetReplyCommands",
      "widgetNewForm",
      "widgetNewCommands",
    ]),
    /** The two dialogs: opening a conversation, and answering one. */
    overlays: createPhiPresetCmsInstanceIdMap(identity, ["overlayNew", "overlayReply"]),
    /** And the Layouts they fill. */
    layouts: createPhiPresetCmsInstanceIdMap(identity, ["layoutNew", "layoutNewFooter", "layoutReply", "layoutReplyFooter"]),
  };
}
