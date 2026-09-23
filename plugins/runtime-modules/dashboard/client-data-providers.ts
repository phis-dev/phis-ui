"use client";

import type { PhiRuntimeModuleDataProviderClientDefinition } from "../contracts";
import { PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY } from "./ids";
import { PHI_DASHBOARD_RUNTIME_MODULE_ID } from "./ids";

/**
 * The fan-in provider, in both modes.
 *
 * Authoring loads the same client rather than a stand-in, because the alternative is a thrown error:
 * a Dashboard opened in the Builder asks for a provider like any other page, and a definition with
 * only a live loader makes that page unopenable.
 *
 * What it shows there is honest but thin. The provider sends the Area from its config and the path it
 * actually stands on, and in the Builder that path is the Builder's own -- so the Site door resolves a
 * different Area than the config names and answers with no cards. An author sees the Widget and its
 * empty state, not the contributions. Teaching the door that it is being asked on behalf of another
 * Area's page is its own piece of work and is not done.
 */
export const PHI_DASHBOARD_RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS = [
  {
    key: PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
    ownerModuleId: PHI_DASHBOARD_RUNTIME_MODULE_ID,
    loadLive: async () =>
      (await import("../../../plugins/runtime-modules/dashboard/services/collection"))
        .PhiDashboardCardCollectionProviderClient,
    loadAuthoring: async () =>
      (await import("../../../plugins/runtime-modules/dashboard/services/collection"))
        .PhiDashboardCardCollectionProviderClient,
  },
] satisfies readonly PhiRuntimeModuleDataProviderClientDefinition[];
