/**
 * The route handlers a Site mounts to reach Core: its doors for auth, site, Add-on and hook traffic, the
 * Form gateway and the media route.
 *
 * These are the only part of the gateway a Site imports. Everything else under `gateway/` -- reads from
 * Core, caches, label sets, translators -- is how `@phis/ui` renders, not something a Site or a Module
 * calls, and is not exported.
 */
export {
  buildPhiAddonProxyHandlers,
  type BuildPhiAddonProxyHandlersOptions,
} from "../gateway/addon-proxy";
export {
  buildPhiHookProxyHandlers,
  type BuildPhiHookProxyHandlersOptions,
} from "../gateway/hook-proxy";
export {
  buildPhiAuthProxyHandlers,
  type BuildPhiAuthProxyHandlersOptions,
} from "../gateway/auth-proxy";
export {
  buildPhiSiteFormRouteHandlers,
  type BuildPhiSiteFormRouteHandlersOptions,
  type PhiSiteAreaRuntimeModuleCatalogLoader,
} from "../gateway/site-form-route";
export {
  buildPhiMediaProxyHandlers,
  type BuildPhiMediaProxyHandlersOptions,
} from "../gateway/media-proxy";
export {
  buildPhiSiteProxyHandlers,
  type BuildPhiSiteProxyHandlersOptions,
} from "../gateway/site-proxy";
