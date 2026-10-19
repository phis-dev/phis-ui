import { PhiContentEntryPart } from "../../../constants/content-entry-parts";
import { definePhiContentEntryRoutes } from "../content-entry-routes";
import { PHI_BLOG_FORM_IDS, PHI_BLOG_PRESET_KEYS, PHI_BLOG_RUNTIME_MODULE_ID } from "./ids";

/**
 * Blog's three Pages (`CONTENT_ENTRIES.md`): what makes them a blog's is said here, the rest is the shared
 * builders'. Posts read as cards, a post opens with its category and its author, and what follows it is
 * more posts as cards.
 */
export const PHI_BLOG_RUNTIME_MODULE_ROUTES = definePhiContentEntryRoutes({
  kind: "blog",
  ownerModuleId: PHI_BLOG_RUNTIME_MODULE_ID,
  presetKeys: PHI_BLOG_PRESET_KEYS,
  formIds: PHI_BLOG_FORM_IDS,
  title: "Blog",
  entryTitle: "Blog post",
  icon: "antd:file-text",
  listPresentation: "cards",
  // An article's opening: tags, category, title, subtitle, byline with picture, and the date.
  headerParts: PhiContentEntryPart.Title | PhiContentEntryPart.Subtitle | PhiContentEntryPart.Date
    | PhiContentEntryPart.Author | PhiContentEntryPart.Avatar | PhiContentEntryPart.Category
    | PhiContentEntryPart.Tags,
  related: { presentation: "cards", title: "More posts" },
  loadKindLabels: () => import("./labels").then((module) => module.getPhiBlogKindLabels),
});
