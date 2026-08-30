import "server-only";

import { PHI_ACCOUNTING_RUNTIME_MODULE_CATALOG } from "../../plugins/runtime-modules/area-catalogs/accounting";
import { createPhiNextCmsSiteBridge } from "../site-bridge";

export const PHI_ACCOUNTING_CMS_SITE_BRIDGE = createPhiNextCmsSiteBridge({
  runtimeModuleCatalog: PHI_ACCOUNTING_RUNTIME_MODULE_CATALOG,
});
