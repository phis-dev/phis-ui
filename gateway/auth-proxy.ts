import { PhiNextProxy } from "../net/phi-next-proxy";

export type BuildPhiAuthProxyHandlersOptions = {
  upstreamBaseUrl: string;
  timeoutMs: number;
  buildHeaders: Parameters<typeof PhiNextProxy>[0]["buildHeaders"];
  logLabel?: string;
  missingBaseUrlMessage?: string;
};

export function buildPhiAuthProxyHandlers({
  upstreamBaseUrl,
  timeoutMs,
  buildHeaders,
  logLabel = "[phi-shared][/api/auth proxy]",
  missingBaseUrlMessage = "Missing apiBaseUrl for /api/auth proxy.",
}: BuildPhiAuthProxyHandlersOptions) {
  return PhiNextProxy({
    upstreamBaseUrl,
    upstreamPrefix: "/api/v1/auth",
    timeoutMs,
    logLabel,
    missingBaseUrlMessage,
    buildHeaders,
    buildFetchInit: () => ({ cache: "no-store" }),
  });
}
