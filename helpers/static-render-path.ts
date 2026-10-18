/** Where the static route tree lives. Only the proxy may send a request there (`next/site-proxy.ts`). */
export const PHI_STATIC_RENDER_PREFIX = "/static-render";

/**
 * The address the visitor opened, given the path a render sees.
 *
 * The proxy rewrites an anonymous Public request to `/static-render/<marker>/<mode>/<locale>/<path>`, and
 * a static render's `usePathname` answers that address while the browser answers `/<locale>/<path>`. A
 * Client Widget deciding by the path -- the current navigation item, a breadcrumb, a locale link -- drew
 * one thing on the server and another in the browser, and the page failed to hydrate (React #418,
 * AUDIT-2026-10-13 PM14). Every other path is returned as it is.
 */
export function readPhiVisitorPathname(pathname: string): string {
  if (!pathname.startsWith(`${PHI_STATIC_RENDER_PREFIX}/`)) {
    return pathname;
  }
  // "", "static-render", marker, mode, then the visitor's own segments.
  return `/${pathname.split("/").slice(4).join("/")}`;
}
