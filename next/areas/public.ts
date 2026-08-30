import "server-only";

import { PHI_PUBLIC_RUNTIME_MODULE_CATALOG } from "../../plugins/runtime-modules/area-catalogs/public";
import { createPhiNextCmsSiteBridge } from "../site-bridge";

export const PHI_PUBLIC_CMS_SITE_BRIDGE = createPhiNextCmsSiteBridge({
  runtimeModuleCatalog: PHI_PUBLIC_RUNTIME_MODULE_CATALOG,
});
