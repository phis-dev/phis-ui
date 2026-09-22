import type { PhiRuntimeModuleDataProviderDescriptor } from "../contracts";
import {
  PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
  PHI_DASHBOARD_CARD_ITEM_RENDERER_KEY,
  PHI_DASHBOARD_CARD_RESOURCE_KEY,
} from "./ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

/**
 * One provider, one resource, and the Collection Widget is unchanged.
 *
 * Making a Collection's `source` plural was the other way to fan N Modules in, and it would have forced
 * ordering, pagination and totals to be answered across sources for every Collection in the house --
 * including the ones that will never have more than one. So the fan-in is a provider like any other,
 * and what it collects is the only thing about it that is unusual.
 *
 * It offers no search, no filters and no pagination: the rows are what the active Modules offered, and
 * a Site with twelve of them has twelve cards. Searching a Dashboard is a question to ask once somebody
 * has one worth searching.
 */
export const PHI_DASHBOARD_RUNTIME_DATA_PROVIDER_DESCRIPTORS = [
  {
    key: PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    kind: "collection",
    executionMode: "live",
    authoringMode: "none",
    title: "Dashboard cards",
    description: "The cards the Area's active Modules offer this Dashboard.",
    resources: [{
      resourceKey: PHI_DASHBOARD_CARD_RESOURCE_KEY,
      title: "Cards",
      description: "One row per card offered by an active Module.",
      itemIdentityPath: "cardId",
      itemRendererKey: PHI_DASHBOARD_CARD_ITEM_RENDERER_KEY,
      defaultForWidget: true,
      query: {},
    }],
  },
] satisfies readonly PhiRuntimeModuleDataProviderDescriptor[];
