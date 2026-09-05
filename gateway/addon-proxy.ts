import { PhiNextProxy } from "../net/phi-next-proxy";

export type BuildPhiAddonProxyHandlersOptions = {
  upstreamBaseUrl: string;
  timeoutMs: number;
  buildHeaders: Parameters<typeof PhiNextProxy>[0]["buildHeaders"];
  logLabel?: string;
  missingBaseUrlMessage?: string;
};

/**
 * The door a Site's own surfaces reach an Add-on's routes through.
 *
 * An Add-on's API lives on Core at `/api/v1/addons/*`, and until now nothing on a Site could reach it:
 * a Site proxies `/api/site`, `/api/auth` and its Builder API, so a Module half calling its own Add-on
 * half arrived at the Site's 404 page. The two halves ship in one package and are the ordinary way an
 * Add-on gets a surface, so the door belongs in the scaffold rather than in each Site.
 *
 * Short on the outside and versioned upstream, as `/api/auth` already is: the version belongs to Core's
 * contract with the Add-on and is not a thing a Site's URLs should have to carry.
 *
 * It forwards and decides nothing. Which authentication a route requires is declared in the Add-on's
 * manifest and enforced by Core before dispatch, so a proxy that judged anything here would be a second
 * opinion about a question that already has an answer.
 */
export function buildPhiAddonProxyHandlers({
  upstreamBaseUrl,
  timeoutMs,
  buildHeaders,
  logLabel = "[phis-ui][/api/addons proxy]",
  missingBaseUrlMessage = "Missing apiBaseUrl for /api/addons proxy.",
}: BuildPhiAddonProxyHandlersOptions) {
  return PhiNextProxy({
    upstreamBaseUrl,
    upstreamPrefix: "/api/v1/addons",
    timeoutMs,
    logLabel,
    missingBaseUrlMessage,
    buildHeaders,
    buildFetchInit: () => ({ cache: "no-store" }),
  });
}
