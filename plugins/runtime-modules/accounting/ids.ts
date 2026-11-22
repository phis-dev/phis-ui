import { PHI_SHARED_PACKAGE_NAME } from "../../../types/signals";
import type { PhiRuntimeModuleDefinition } from "../../../types/cms-plugins";
import type { PhiRuntimeModuleId } from "../contracts";
import { createPhiSharedRuntimeDataProviderKey } from "../../../constants/runtime-data-provider-key";
import { createPhiPresetCmsInstanceIdMap } from "../../../types/cms-instance-id";

export const PHI_ACCOUNTING_RUNTIME_MODULE_ID =
  `${PHI_SHARED_PACKAGE_NAME}/modules/accounting` as const satisfies PhiRuntimeModuleId;

/**
 * The Module's identity as its Label Sets inherit it (`definePhiRuntimeModuleLabelSet`): the id and,
 * where a Module declares one, its source locale. Stated here beside the id and spread into the
 * definition, so a Label Set a tree reads does not import the definition that imports the tree.
 */
export const PHI_ACCOUNTING_RUNTIME_MODULE_IDENTITY = {
  moduleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
} as const satisfies Pick<PhiRuntimeModuleDefinition, "moduleId" | "sourceLocale">;

/**
 * The Site's product directory (phis-server SERVER_ADDONS.md, `products:v1`): every product of every
 * supplier Add-on, as the Site operator administers it. A Page of the Accounting Area itself rather than
 * of a shop, because every supplier's products land in it and it has to work with no shop at all.
 */
export const PHI_ACCOUNTING_PRODUCTS_DATA_PROVIDER_KEY = createPhiSharedRuntimeDataProviderKey("tables", "accounting-products");

/** The one resource the directory's Provider answers. */
export const PHI_ACCOUNTING_PRODUCTS_RESOURCE_KEY = "products";

export const PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY = "accounting-products-page";

const PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET = {
  domain: "page",
  ownerModuleId: PHI_ACCOUNTING_RUNTIME_MODULE_ID,
  presetKey: PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET_KEY,
} as const;

export const PHI_ACCOUNTING_PRODUCTS_PAGE_LAYOUT_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET,
  ["layoutTerms"],
);

export const PHI_ACCOUNTING_PRODUCTS_PAGE_OVERLAY_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET,
  ["overlayTerms"],
);

export const PHI_ACCOUNTING_PRODUCTS_PAGE_WIDGET_IDS = createPhiPresetCmsInstanceIdMap(
  PHI_ACCOUNTING_PRODUCTS_PAGE_PRESET,
  ["widgetTable", "widgetTerms"],
);
