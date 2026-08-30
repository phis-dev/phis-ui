import { PhiNextProxy } from "../net/phi-next-proxy";

export type BuildPhiMediaProxyHandlersOptions = {
  upstreamBaseUrl: string;
  timeoutMs: number;
  buildHeaders: Parameters<typeof PhiNextProxy>[0]["buildHeaders"];
  logLabel?: string;
  missingBaseUrlMessage?: string;
};

export function buildPhiMediaProxyHandlers({
  upstreamBaseUrl,
  timeoutMs,
  buildHeaders,
  logLabel = "[phi-shared][/media proxy]",
  missingBaseUrlMessage = "Missing apiBaseUrl for /media proxy.",
}: BuildPhiMediaProxyHandlersOptions) {
  return PhiNextProxy({
    upstreamBaseUrl,
    upstreamPrefix: "/media",
    timeoutMs,
    logLabel,
    missingBaseUrlMessage,
    buildHeaders,
    buildFetchInit: () => ({ cache: "no-store" }),
  });
}
