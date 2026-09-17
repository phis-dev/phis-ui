/**
 * The route handlers a Site mounts to reach Core: its doors for auth, site, Add-on and hook traffic, and
 * the Form gateway.
 *
 * Assets are not among them. An Asset is delivered from `/api/site/media/{id}/content|variants|subsets`,
 * which the Site's `/api/site` proxy already forwards; a second short address in front of it would be one
 * more thing to keep pointing at the right place, and the one that existed pointed at a Core route that
 * had been retired.
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
  buildPhiSiteProxyHandlers,
  type BuildPhiSiteProxyHandlersOptions,
} from "../gateway/site-proxy";
