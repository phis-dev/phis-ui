import "server-only";

import { PHI_ADMIN_RUNTIME_MODULE_CATALOG } from "../../plugins/runtime-modules/area-catalogs/admin";
import { createPhiNextCmsSiteBridge } from "../site-bridge";

export const PHI_ADMIN_CMS_SITE_BRIDGE = createPhiNextCmsSiteBridge({
  runtimeModuleCatalog: PHI_ADMIN_RUNTIME_MODULE_CATALOG,
});
