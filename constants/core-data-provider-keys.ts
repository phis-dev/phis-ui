import { createPhiSharedRuntimeDataProviderKey } from "./runtime-data-provider-key";

/**
 * The data providers every Site has, by the shared names they are registered under.
 *
 * Foundation vocabulary rather than the Core Module's: the keys live in the shared namespace, the
 * providers behind them sit with the shared Widget clients, and Foundation code -- the Layouts' spacing
 * fields -- names them. A Module's own fields may name them too.
 */
export const PHI_CORE_RUNTIME_DATA_PROVIDER_KEYS = {
  spacingScale: createPhiSharedRuntimeDataProviderKey("options", "spacing-scale"),
  siteLocales: createPhiSharedRuntimeDataProviderKey("options", "core-site-locales"),
  contentTable: createPhiSharedRuntimeDataProviderKey("tables", "content"),
} as const;
