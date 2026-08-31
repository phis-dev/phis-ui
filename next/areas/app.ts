import "server-only";

import { createPhiAppRuntimeModuleCatalog } from "../../plugins/runtime-modules/area-catalogs/app";
import { createPhiNextCmsSiteBridge } from "../site-bridge";
import type { PhiSiteModuleServerAreaContributions } from "../../plugins/runtime-modules/site-modules";

/**
 * The Area host, given what this Site installed.
 *
 * The projection arrives as an argument because a Site build cannot redirect an import that happens
 * inside `@phis/ui`; the Skeleton passes it in once and never changes again when a Module is added.
 */
export function createPhiAppCmsSiteBridge(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiNextCmsSiteBridge({
    runtimeModuleCatalog: createPhiAppRuntimeModuleCatalog(siteModules),
  });
}

export const PHI_APP_CMS_SITE_BRIDGE = createPhiAppCmsSiteBridge();
