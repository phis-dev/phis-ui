import { createPhiSharedRuntimeDataProviderKey } from "./runtime-data-provider-key";

/**
 * The option lists an Inspector field may ask for, as a Foundation contract.
 *
 * A Form Widget lets an author pick a Form, a navigation Widget a Navigation, a Collection View an item
 * renderer, the Theme's wordmark a Page. Each of those fields names the Provider that lists the
 * choices, and naming it used to mean importing `plugins/runtime-modules/builder/ids` -- from Core and
 * from Theme, which a Module may not do: it binds the two at compile time, and an installed package
 * cannot reach that file at all.
 *
 * So the names live here and the answers stay with the Builder, which serves them because it is where
 * authoring happens. The same terms as `media-library-provider-keys.ts`: the Foundation states the
 * contract, never the implementation, and holds no reference to the Module that meets it. A field whose
 * Provider is absent shows an empty list rather than failing to compile.
 */
export const PHI_AUTHORING_OPTION_PROVIDER_KEYS = {
  forms: createPhiSharedRuntimeDataProviderKey("options", "forms"),
  pages: createPhiSharedRuntimeDataProviderKey("options", "builder-pages"),
  navigationSets: createPhiSharedRuntimeDataProviderKey("options", "builder-navigation-sets"),
  collectionItemRenderers: createPhiSharedRuntimeDataProviderKey(
    "options",
    "builder-collection-item-renderers",
  ),
} as const;
