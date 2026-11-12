import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";

export const PHI_SEARCH_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/search` as const satisfies PhiRuntimeModuleId;

/** The results Page each Area the Module serves brings, under the Module's own name (SEARCH.md). */
export const PHI_SEARCH_PAGE_PRESET_KEYS = {
  public: "public-search-page",
  app: "app-search-page",
} as const;
