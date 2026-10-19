import { PhiContentEntryPart } from "../../../constants/content-entry-parts";
import { definePhiContentEntryRoutes } from "../content-entry-routes";
import { PHI_NEWS_FORM_IDS, PHI_NEWS_PRESET_KEYS, PHI_NEWS_RUNTIME_MODULE_ID } from "./ids";

/**
 * News's three Pages (`CONTENT_ENTRIES.md`): what makes them news is said here, the rest is the shared
 * builders'. Entries read whole, one under the next; an entry is dated rather than signed; what follows it
 * is the newest others as compact lines.
 */
export const PHI_NEWS_RUNTIME_MODULE_ROUTES = definePhiContentEntryRoutes({
  kind: "news",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKeys: PHI_NEWS_PRESET_KEYS,
  formIds: PHI_NEWS_FORM_IDS,
  title: "News",
  entryTitle: "News entry",
  icon: "antd:read",
  listPresentation: "stack",
  headerParts: PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle | PhiContentEntryPart.Date
    | PhiContentEntryPart.Tags,
  related: { presentation: "compact", title: "More news" },
  loadKindLabels: () => import("./labels").then((module) => module.getPhiNewsKindLabels),
});
