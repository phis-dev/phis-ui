import "server-only";

import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";
import { assertPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { loadPhiResolvedCmsRequest } from "../server-helpers/cms-request";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";

export function createPhiNextCmsSiteBridge({
  runtimeModuleCatalog,
}: Pick<PhiCmsSiteBridge, "runtimeModuleCatalog">): PhiCmsSiteBridge {
  assertPhiRuntimeModuleCatalog(runtimeModuleCatalog);

  const readRuntime = () => {
    const runtimeConfig = readPhiSiteRuntimeConfigSync();
    return {
      apiBaseUrl: runtimeConfig.phis.apiBaseUrl,
      internalToken: runtimeConfig.phis.internalToken,
      siteKey: runtimeConfig.site.key,
    };
  };

  return {
    runtimeModuleCatalog,
    runtime: readRuntime(),
    loadResolvedRequest: async ({
      siteKey,
      locale,
      path,
      cookieHeader,
      searchParams,
      requestContext,
      runtimeModuleCatalog: requestRuntimeModuleCatalog,
    }) => {
      const runtime = readRuntime();
      return loadPhiResolvedCmsRequest(
        siteKey.trim() || runtime.siteKey,
        locale,
        path,
        cookieHeader,
        runtime.apiBaseUrl,
        runtime.internalToken,
        requestContext,
        searchParams,
        requestRuntimeModuleCatalog,
      );
    },
  };
}
