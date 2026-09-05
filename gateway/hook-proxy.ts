import { PhiNextProxy } from "../net/phi-next-proxy";

export type BuildPhiHookProxyHandlersOptions = {
  upstreamBaseUrl: string;
  timeoutMs: number;
  buildHeaders: Parameters<typeof PhiNextProxy>[0]["buildHeaders"];
  logLabel?: string;
  missingBaseUrlMessage?: string;
};

/**
 * The door an outside caller reaches an Add-on's hooks through.
 *
 * Core is reachable on its own host, so this is not about reachability -- it is about which Site the
 * request is for. A hook is called by somebody who has no account here and no way to say: a payment
 * provider, an OAuth callback, another Core fetching a listing. They send a request to a URL, and the
 * only thing in it that can name a Site is the host. On this door the Site names itself, from its own
 * configuration, which is what makes one Add-on's hook usable by many Sites at once.
 *
 * The prefix stays apart from `/api/addons` on purpose. Both carry the same policy upstream -- the
 * descriptor decides, not the path -- but from the outside the path is the only thing that says which
 * URLs are unauthenticated by design, and an operator's firewall reads paths rather than manifests.
 *
 * It forwards no internal token: what arrives here came from the open internet, and it must not pick up
 * a claim to have come from inside on the way through.
 */
export function buildPhiHookProxyHandlers({
  upstreamBaseUrl,
  timeoutMs,
  buildHeaders,
  logLabel = "[phis-ui][/api/hooks proxy]",
  missingBaseUrlMessage = "Missing apiBaseUrl for /api/hooks proxy.",
}: BuildPhiHookProxyHandlersOptions) {
  return PhiNextProxy({
    upstreamBaseUrl,
    upstreamPrefix: "/api/v1/hooks",
    timeoutMs,
    logLabel,
    missingBaseUrlMessage,
    buildHeaders,
    buildFetchInit: () => ({ cache: "no-store" }),
  });
}
