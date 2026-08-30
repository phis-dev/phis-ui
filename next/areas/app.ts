import "server-only";

import { PHI_APP_RUNTIME_MODULE_CATALOG } from "../../plugins/runtime-modules/area-catalogs/app";
import { createPhiNextCmsSiteBridge } from "../site-bridge";

export const PHI_APP_CMS_SITE_BRIDGE = createPhiNextCmsSiteBridge({
  runtimeModuleCatalog: PHI_APP_RUNTIME_MODULE_CATALOG,
});
