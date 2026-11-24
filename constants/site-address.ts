import { createPhiSharedRuntimeItemRendererKey } from "./runtime-data-provider-key";

/**
 * The address tiles: a Collection's items as the addresses of a Site's book (`PhisSiteAddress`), drawn by
 * Core's renderer (COLLECTIONS.md, "The address renderer"). A resource whose items are addresses in the
 * shape `toPhiSiteAddressRow` gives them (`helpers/site-address-row.ts`) names this key as its
 * `itemRendererKey`, and draws no tiles of its own: the account's own addresses on the App profile and
 * staff's customer file both do. The Foundation names it, so a Module cites it without importing Core's
 * Widget.
 */
export const PHI_SITE_ADDRESS_ITEM_RENDERER_KEY = createPhiSharedRuntimeItemRendererKey("site-address");
