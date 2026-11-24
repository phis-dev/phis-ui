import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";

export const PHI_APP_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/app` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree or a form reads does not import the definition that imports the
 * tree -- and a Module that writes in another language says so once.
 */
export const PHI_APP_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_APP_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

/**
 * The signed-in person's own addresses on this Site (phis-server `GET /api/site/account/addresses`,
 * `users:v1`), as the account lists, adds, changes and removes them.
 */
export const PHI_APP_ADDRESSES_DATA_PROVIDER_KEY = createPhiSharedRuntimeDataProviderKey("tables", "app-addresses");

/** The one resource the addresses Provider answers. */
export const PHI_APP_ADDRESSES_RESOURCE_KEY = "addresses";
