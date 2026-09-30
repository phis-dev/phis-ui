import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
import { createPhiPresetCmsInstanceId } from "../../../types/cms-instance-id";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_NEWS_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/news` as const satisfies PhiRuntimeModuleId;

/**
 * What this Module answers, and what a Widget binds to by name.
 *
 * The table is the Site's own entries, read through the editor endpoint, so every surface that shows them
 * -- the editor page, and any Page a Site composes in the Builder -- reads one thing. The options key is
 * the offer a tag field picks from, which is the set of tags the Site already uses rather than a
 * vocabulary anybody keeps.
 */
export const PHI_NEWS_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "news"),
  tags: createPhiSharedRuntimeDataProviderKey("options", "news-tags"),
} as const;

/** The one resource the table provider answers. */
export const PHI_NEWS_TABLE_RESOURCE_KEY = "entries";

/** The preset key of the Page this Module contributes to the Editor Area, and the Table on it. */
export const PHI_EDITOR_NEWS_PAGE_PRESET_KEY = "editor-news-page";

export const PHI_EDITOR_NEWS_WIDGET_ID = createPhiPresetCmsInstanceId({
  domain: "page",
  ownerModuleId: PHI_NEWS_RUNTIME_MODULE_ID,
  presetKey: PHI_EDITOR_NEWS_PAGE_PRESET_KEY,
  nodeKey: "widgetNews",
});
