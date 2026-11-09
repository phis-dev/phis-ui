import "server-only";

import { createPhiPublicRuntimeModuleCatalog } from "../../plugins/runtime-modules/area-catalogs/public";
import { registerPhiSearchIndexArea } from "../../server-helpers/search-index";
import { createPhiNextCmsSiteBridge } from "../site-bridge";
import type { PhiSiteModuleServerAreaContributions } from "../../plugins/runtime-modules/site-modules";

/**
 * The Area host, given what this Site installed.
 *
 * The projection arrives as an argument because a Site build cannot redirect an import that happens
 * inside `@phis/ui`; the Skeleton passes it in once and never changes again when a Module is added.
 */
export function createPhiPublicCmsSiteBridge(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  const bridge = createPhiNextCmsSiteBridge({
    runtimeModuleCatalog: createPhiPublicRuntimeModuleCatalog(siteModules),
  });
  // The Public Pages are indexed for the Site's search from this Bridge (SEARCH.md).
  registerPhiSearchIndexArea("public", bridge);
  return bridge;
}

export const PHI_PUBLIC_CMS_SITE_BRIDGE = createPhiPublicCmsSiteBridge();
