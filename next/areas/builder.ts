import "server-only";

import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../../plugins/runtime-modules/catalog";
import { createPhiNextCmsSiteBridge } from "../site-bridge";

export const PHI_BUILDER_CMS_SITE_BRIDGE = createPhiNextCmsSiteBridge({
  runtimeModuleCatalog: PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG,
});
