import { PhiNextProxy } from "../net/phi-next-proxy";

export type BuildPhiSiteProxyHandlersOptions = {
  upstreamBaseUrl: string;
  timeoutMs: number;
  buildHeaders: Parameters<typeof PhiNextProxy>[0]["buildHeaders"];
  logLabel?: string;
  missingBaseUrlMessage?: string;
};

export function buildPhiSiteProxyHandlers({
  upstreamBaseUrl,
  timeoutMs,
  buildHeaders,
  logLabel = "[phis-ui][/api/site proxy]",
  missingBaseUrlMessage = "Missing apiBaseUrl for /api/site proxy.",
}: BuildPhiSiteProxyHandlersOptions) {
  return PhiNextProxy({
    upstreamBaseUrl,
    upstreamPrefix: "/api/site",
    timeoutMs,
    logLabel,
    missingBaseUrlMessage,
    buildHeaders,
    buildFetchInit: () => ({ cache: "no-store" }),
  });
}
