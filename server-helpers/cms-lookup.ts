import "server-only";

import { resolvePhiCmsAreaMask, type PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import type { PhiSiteRequestContext } from "../types/site-request-context";
import { getPhiCmsPage, getPhiExactSiteArea } from "./cms";
import { resolvePhiCmsRequest } from "./cms-request";
import { runWithPhiRequestRuntime } from "./request-runtime";
import { buildPhiBlockRuntime } from "./runtime";

/**
 * The request resolution run as a lookup: same routing table, same access checks, same Builder-configured
 * root route, binding no request state.
 *
 * A route handler and a sitemap have no request runtime bound, and a lookup deliberately binds none --
 * but the helpers under the resolution (translations, locale fetches) read one globally. The scope here
 * gives them a runtime for exactly this unit of work, isolated from everything outside it. Two callers
 * built this scaffold for themselves, lambda for lambda, differing only in the cookie they carried.
 */
export async function resolvePhiCmsLookup({
  bridge,
  area,
  locale,
  path,
  cookieHeader,
  requestContext,
}: {
  bridge: PhiCmsSiteBridge;
  area: PhiCmsAreaKey;
  locale: string;
  path: string;
  /** The viewer's cookies, or none for a question asked on nobody's behalf (a crawler's). */
  cookieHeader: string;
  requestContext: PhiSiteRequestContext;
}) {
  const bridgeRuntime = bridge.runtime;
  if (!bridgeRuntime) {
    throw new Error("A CMS lookup needs the Site Bridge's runtime.");
  }
  const { siteKey, apiBaseUrl, internalToken } = bridgeRuntime;
  const scopeRuntime = buildPhiBlockRuntime({
    requestContext,
    areaMask: resolvePhiCmsAreaMask(area),
  });
  return runWithPhiRequestRuntime(scopeRuntime, () => resolvePhiCmsRequest({
    siteKey,
    locale,
    area,
    path,
    cookieHeader,
    apiBaseUrl,
    internalToken,
    requestContext,
    runtimeModuleCatalog: bridge.runtimeModuleCatalog,
    purpose: "lookup",
    loadExactCmsArea: (requestPath, sourcePreset) =>
      getPhiExactSiteArea({
        path: requestPath,
        siteKey,
        apiBaseUrl,
        internalToken,
        locale,
        cookieHeader,
        sourcePreset,
      }),
    loadResolvedCmsPage: (requestPath, sourcePreset) =>
      getPhiCmsPage({
        path: requestPath,
        siteKey,
        apiBaseUrl,
        internalToken,
        locale,
        cookieHeader,
        sourcePreset,
      }),
  }));
}
