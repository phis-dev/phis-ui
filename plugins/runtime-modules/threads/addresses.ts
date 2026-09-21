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
 * Every one of the three names at least one of the others in a route, so none of the ids may be
 * positional: the listing sends the conversation and the composer what was chosen, and the composer
 * asks the conversation to read itself again.
 */
export const PHI_APP_THREADS_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(identity, [
  "widgetInbox",
  "widgetConversation",
  "widgetComposer",
]);
