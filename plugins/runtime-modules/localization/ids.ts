import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_LOCALIZATION_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/localization` as const satisfies PhiRuntimeModuleId;


export const PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "localization"),
  platformLocales: createPhiSharedRuntimeDataProviderKey("options", "localization-locales"),
  adminSiteLocales: createPhiSharedRuntimeDataProviderKey("options", "admin-site-locales"),
  siteLocales: createPhiSharedRuntimeDataProviderKey("options", "site-locales"),
  translationContexts: createPhiSharedRuntimeDataProviderKey("options", "translation-contexts"),
} as const;
