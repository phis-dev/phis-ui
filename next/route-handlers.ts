/**
 * The route handlers a Site mounts to reach Core: its doors for auth, site, Add-on and hook traffic.
 *
 * One door per kind of traffic, and never one per address. A Site's route files are written when it is
 * installed and then belong to the installation, so every address spelled as a file there is an address
 * that can never be revised, while `@phis/ui` arrives through the dependency and is replaced with it.
 * Forms, Module diagnostics and navigation targets are therefore not mounted: they live under
 * `/api/site`, and `buildPhiSiteProxyHandlers` answers them from the Site instead of forwarding them.
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
  buildPhiSiteProxyHandlers,
  type BuildPhiSiteProxyHandlersOptions,
} from "../gateway/site-proxy";
export type { PhiSiteAreaBridgeLoader } from "../gateway/site-area-bridges";
