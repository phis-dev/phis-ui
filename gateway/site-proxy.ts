import { PhiNextProxy, type PhiNextProxyHandler, type PhiNextProxyHandlers } from "../net/phi-next-proxy";
import { clearPhiSiteReadCache } from "./site-read-cache";

export type BuildPhiSiteProxyHandlersOptions = {
  upstreamBaseUrl: string;
  timeoutMs: number;
  buildHeaders: Parameters<typeof PhiNextProxy>[0]["buildHeaders"];
  logLabel?: string;
  missingBaseUrlMessage?: string;
};

/**
 * A write Core accepted may have changed what this Site process keeps in its read cache. Which writes do
 * is not worth listing: config and Navigation carry the theme draft, settings, logo revision and Page
 * paths, and a list would fall behind the next endpoint. Every accepted write clears it.
 */
function clearingReadCacheOnWrite(handler: PhiNextProxyHandler): PhiNextProxyHandler {
  return async (request, context) => {
    const response = await handler(request, context);
    if (response.ok) {
      clearPhiSiteReadCache();
    }
    return response;
  };
}

export function buildPhiSiteProxyHandlers({
  upstreamBaseUrl,
  timeoutMs,
  buildHeaders,
  logLabel = "[phis-ui][/api/site proxy]",
  missingBaseUrlMessage = "Missing apiBaseUrl for /api/site proxy.",
}: BuildPhiSiteProxyHandlersOptions): PhiNextProxyHandlers {
  const handlers = PhiNextProxy({
    upstreamBaseUrl,
    upstreamPrefix: "/api/site",
    timeoutMs,
    logLabel,
    missingBaseUrlMessage,
    buildHeaders,
    buildFetchInit: () => ({ cache: "no-store" }),
  });
  return {
    ...handlers,
    POST: clearingReadCacheOnWrite(handlers.POST),
    PUT: clearingReadCacheOnWrite(handlers.PUT),
    PATCH: clearingReadCacheOnWrite(handlers.PATCH),
    DELETE: clearingReadCacheOnWrite(handlers.DELETE),
  };
}
