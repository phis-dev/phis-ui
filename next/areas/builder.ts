import "server-only";

import { createPhiBuilderRuntimeModuleCatalog } from "../../plugins/runtime-modules/catalog";
import { loadPhiThemeBlockCatalog } from "../../plugins/runtime-modules/theme/block-catalog";
import type { PhiThemeBlockCatalog } from "../../theme/phi-theme-composition";
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
  const runtimeModuleCatalog = createPhiBuilderRuntimeModuleCatalog(siteModules);
  // Composed once per bridge, as the root composes its own: nothing in it changes between requests.
  let themeBlockCatalog: Promise<PhiThemeBlockCatalog> | null = null;
  return createPhiNextCmsSiteBridge({
    runtimeModuleCatalog,
    loadThemeBlockCatalog: () => (themeBlockCatalog ??= loadPhiThemeBlockCatalog(runtimeModuleCatalog)),
  });
}

export const PHI_BUILDER_CMS_SITE_BRIDGE = createPhiBuilderCmsSiteBridge();
