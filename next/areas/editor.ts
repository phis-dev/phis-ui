import "server-only";

import { PHI_EDITOR_RUNTIME_MODULE_CATALOG } from "../../plugins/runtime-modules/area-catalogs/editor";
import { createPhiNextCmsSiteBridge } from "../site-bridge";

export const PHI_EDITOR_CMS_SITE_BRIDGE = createPhiNextCmsSiteBridge({
  runtimeModuleCatalog: PHI_EDITOR_RUNTIME_MODULE_CATALOG,
});
