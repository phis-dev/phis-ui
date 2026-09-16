import "server-only";

import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";
import { assertPhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { loadPhiResolvedCmsRequest } from "../server-helpers/cms-request";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

export function createPhiNextCmsSiteBridge({
  runtimeModuleCatalog,
  loadThemeBlockCatalog,
}: Pick<PhiCmsSiteBridge, "runtimeModuleCatalog" | "loadThemeBlockCatalog">): PhiCmsSiteBridge {
  assertPhiRuntimeModuleCatalog(runtimeModuleCatalog);

  const readRuntime = () => {
    const runtimeConfig = readPhiSiteRuntimeConfigSync();
    return {
      apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
      internalToken: readPhiServerApiCredentials().internalToken,
      siteKey: runtimeConfig.site.key,
    };
  };

  return {
    runtimeModuleCatalog,
    loadThemeBlockCatalog,
    runtime: readRuntime(),
    loadResolvedRequest: async ({
      siteKey,
      locale,
      area,
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
        area,
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
