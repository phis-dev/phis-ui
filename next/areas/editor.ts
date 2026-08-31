import "server-only";

import { createPhiEditorRuntimeModuleCatalog } from "../../plugins/runtime-modules/area-catalogs/editor";
import { createPhiNextCmsSiteBridge } from "../site-bridge";
import type { PhiSiteModuleServerAreaContributions } from "../../plugins/runtime-modules/site-modules";

/**
 * The Area host, given what this Site installed.
 *
 * The projection arrives as an argument because a Site build cannot redirect an import that happens
 * inside `@phis/ui`; the Skeleton passes it in once and never changes again when a Module is added.
 */
export function createPhiEditorCmsSiteBridge(
  siteModules: PhiSiteModuleServerAreaContributions = {},
) {
  return createPhiNextCmsSiteBridge({
    runtimeModuleCatalog: createPhiEditorRuntimeModuleCatalog(siteModules),
  });
}

export const PHI_EDITOR_CMS_SITE_BRIDGE = createPhiEditorCmsSiteBridge();
