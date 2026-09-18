import { PhiNextProxy, type PhiNextProxyHandler, type PhiNextProxyHandlers } from "../net/phi-next-proxy";
import { clearPhiSiteReadCache } from "./site-read-cache";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";

export type BuildPhiSiteProxyHandlersOptions = {
  upstreamBaseUrl: string;
  timeoutMs: number;
  buildHeaders: Parameters<typeof PhiNextProxy>[0]["buildHeaders"];
  logLabel?: string;
  missingBaseUrlMessage?: string;
  /**
   * The Site's own Modules, for the paths under `/api/site` that are answered here rather than upstream.
   *
   * A Site mounts one door and hands over one thing, and which paths never leave is decided in this
   * package. A Site's route files are written once and then belong to the installation, so a decision
   * spelled as a file path there could never be revised; @phis/ui arrives through its dependency.
   */
  loadAreaBridge: PhiSiteAreaBridgeLoader;
};

/**
 * The paths under `/api/site` that Core cannot answer, because the answer is in the Site.
 *
 * `forms` resolves the submit handler a Module registered before anything goes upstream;
 * `module-diagnostics` compares what this Site's Modules require against what its server offers; and
 * `navigation-target` resolves where a forwarding Area root would send this viewer. All three read the
 * Site's own Module catalogs, which phi-server deliberately knows nothing about.
 *
 * They are one segment each and matched exactly, so nothing deeper is captured by accident: an Asset
 * under `/api/site/media/...` goes upstream as it always did.
 */
const LOCALLY_ANSWERED = ["forms", "module-diagnostics", "navigation-target"] as const;

type PhiLocallyAnsweredPath = (typeof LOCALLY_ANSWERED)[number];

function locallyAnswered(path: string[] | undefined): PhiLocallyAnsweredPath | null {
  const first = path?.length === 1 ? path[0] : null;
  return LOCALLY_ANSWERED.find((candidate) => candidate === first) ?? null;
}

/**
 * Loaded when a request asks for it, never when the door is mounted.
 *
 * Resolving a Form, a diagnostic or a navigation target reaches deep into the rendering side of this
 * package. Importing that at module scope would put it in the graph of a route that for nearly every
 * request only copies bytes to Core and back.
 */
async function buildLocallyAnsweredHandlers(
  answered: PhiLocallyAnsweredPath,
  { upstreamBaseUrl, timeoutMs, buildHeaders, loadAreaBridge }: BuildPhiSiteProxyHandlersOptions,
): Promise<Partial<PhiNextProxyHandlers>> {
  if (answered === "forms") {
    const { buildPhiSiteFormRouteHandlers } = await import("./site-form-route");
    const handlers = buildPhiSiteFormRouteHandlers({
      upstreamBaseUrl,
      timeoutMs,
      missingBaseUrlMessage: "Missing apiBaseUrl for /api/site/forms proxy.",
      buildHeaders: (request) => buildHeaders(request, undefined),
      loadAreaBridge,
    });
    return { GET: handlers.GET, POST: handlers.POST };
  }
  if (answered === "module-diagnostics") {
    const { buildPhiSiteModuleDiagnosticsRouteHandler } = await import("./module-diagnostics-route");
    return { GET: buildPhiSiteModuleDiagnosticsRouteHandler({ loadAreaBridge }) };
  }
  const { buildPhiNavigationTargetRouteHandler } = await import("./navigation-target-route");
  return { GET: buildPhiNavigationTargetRouteHandler({ loadAreaBridge }) };
}

/**
 * A write Core accepted may have changed what this Site process keeps in its read cache. Which writes do
 * is not worth listing: config and Navigation carry the theme draft, settings, logo revision and Page
 * paths, and a list would fall behind the next endpoint. Every accepted write clears it.
 *
 * Translations are not cleared here. The next Site config read carries their change markers, and
 * helpers/translation-cache.ts empties only a store whose marker moved.
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

export function buildPhiSiteProxyHandlers(
  options: BuildPhiSiteProxyHandlersOptions,
): PhiNextProxyHandlers {
  const {
    upstreamBaseUrl,
    timeoutMs,
    buildHeaders,
    logLabel = "[phis-ui][/api/site proxy]",
    missingBaseUrlMessage = "Missing apiBaseUrl for /api/site proxy.",
  } = options;
  const handlers = PhiNextProxy({
    upstreamBaseUrl,
    upstreamPrefix: "/api/site",
    timeoutMs,
    logLabel,
    missingBaseUrlMessage,
    buildHeaders,
    buildFetchInit: () => ({ cache: "no-store" }),
  });

  // Built once per path and kept, so a Site that answers Forms all day pays the import a single time.
  const built = new Map<PhiLocallyAnsweredPath, Promise<Partial<PhiNextProxyHandlers>>>();

  /**
   * The local answer where there is one, and upstream otherwise.
   *
   * Wrapped around the proxy rather than beside it, which is what keeps the read cache out of the local
   * paths: a Form submit reaches Core through its own resolution and does not touch what this Site has
   * cached to render with. A method a local path does not offer is 405 and never a proxied request, so
   * an address that is answered here is answered here for every verb -- with the `Allow` header and the
   * fallback from HEAD to GET that these paths had from Next while they were route files of their own.
   */
  function answeringLocally(
    method: keyof PhiNextProxyHandlers,
    proxied: PhiNextProxyHandler,
  ): PhiNextProxyHandler {
    return async (request, context) => {
      const answered = locallyAnswered((await context.params).path);
      if (!answered) {
        return proxied(request, context);
      }
      let pending = built.get(answered);
      if (!pending) {
        pending = buildLocallyAnsweredHandlers(answered, options);
        built.set(answered, pending);
      }
      const handlers = await pending;
      const local = handlers[method] ?? (method === "HEAD" ? handlers.GET : undefined);
      if (!local) {
        const allow = Object.keys(handlers).join(", ");
        return new Response(null, { status: 405, headers: { allow } });
      }
      return local(request, context);
    };
  }

  return {
    GET: answeringLocally("GET", handlers.GET),
    HEAD: answeringLocally("HEAD", handlers.HEAD),
    OPTIONS: answeringLocally("OPTIONS", handlers.OPTIONS),
    POST: answeringLocally("POST", clearingReadCacheOnWrite(handlers.POST)),
    PUT: answeringLocally("PUT", clearingReadCacheOnWrite(handlers.PUT)),
    PATCH: answeringLocally("PATCH", clearingReadCacheOnWrite(handlers.PATCH)),
    DELETE: answeringLocally("DELETE", clearingReadCacheOnWrite(handlers.DELETE)),
  };
}
