import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_CDN_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/cdn` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`), stated beside
 * the id so a Label Set a tree reads does not import the definition that imports the tree.
 */
export const PHI_CDN_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_CDN_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

export const PHI_CDN_RUNTIME_DATA_PROVIDER_KEYS = {
  table: createPhiSharedRuntimeDataProviderKey("tables", "cdn"),
  /** The names the catalogue holds files under, as choices for the upload's Name. */
  names: createPhiSharedRuntimeDataProviderKey("options", "cdn-names"),
} as const;

/** The resources of the table Provider: the catalogue, and what one check of the bucket found. */
export const PHI_CDN_TABLE_RESOURCE_KEYS = {
  files: "files",
  check: "check",
} as const;

/** The Admin Page the Module brings, and the key its nodes' preset ids are derived from. */
export const PHI_CDN_ADMIN_PAGE_PRESET_KEY = "admin-cdn-page";
