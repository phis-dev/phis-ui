import "server-only";

import { createPhiBuilderRuntimeModuleCatalog } from "../../plugins/runtime-modules/catalog";
import { createPhiNextCmsSiteBridge } from "../site-bridge";
import type { PhiSiteModuleServerAreaContributions } from "../../plugins/runtime-modules/site-modules";

/**
 * The Area host, given what this Site installed.
 *
 * The projection arrives as an argument because a Site build cannot redirect an import that happens
 * inside `@phis/ui`; the Skeleton passes it in once and never changes again when a Module is added.
 */
export function createPhiBuilderCmsSiteBridge(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiNextCmsSiteBridge({
    runtimeModuleCatalog: createPhiBuilderRuntimeModuleCatalog(siteModules),
  });
}

export const PHI_BUILDER_CMS_SITE_BRIDGE = createPhiBuilderCmsSiteBridge();
