import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
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
