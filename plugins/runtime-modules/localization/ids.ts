import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_LOCALIZATION_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/localization` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree or a form reads does not import the definition that imports the
 * tree -- and a Module that writes in another language says so once.
 */
export const PHI_LOCALIZATION_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_LOCALIZATION_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;


export const PHI_LOCALIZATION_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "localization"),
  platformLocales: createPhiSharedRuntimeDataProviderKey("options", "localization-locales"),
  adminSiteLocales: createPhiSharedRuntimeDataProviderKey("options", "admin-site-locales"),
  siteLocales: createPhiSharedRuntimeDataProviderKey("options", "site-locales"),
  translationContexts: createPhiSharedRuntimeDataProviderKey("options", "translation-contexts"),
} as const;
