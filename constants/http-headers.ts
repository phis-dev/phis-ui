/**
 * The request header names, re-exported from the one place that defines them.
 *
 * The names live in `@phis/contracts/http`, because this package writes the headers phis reads and a
 * disagreement between the two is a runtime 403 rather than a build failure. They are re-exported here
 * so site repositories can reach them through `@phis/ui/constants` like every other shared constant.
 */

export {
  PHIS_AREA_HEADER,
  PHIS_REQUEST_PATH_HEADER,
  PHIS_REQUEST_SEARCH_HEADER,
  PHIS_SITE_KEY_HEADER,
  PHIS_TOKEN_HEADER,
} from "@phis/contracts/http";

/**
 * That this request is a client navigation rather than a document request.
 *
 * Not in `@phis/contracts/http` on purpose: phis never sees it. The proxy sets it and this Site's own
 * render reads it, both inside one process, so the two cannot disagree across a version boundary the way
 * the headers above can.
 *
 * It exists because Next does not let a Server Component ask. `RSC` and `Next-Router-State-Tree` arrive
 * on the wire -- the proxy has them -- but the framework consumes them before `headers()`, which was
 * measured: `rsc` reads `null` in a Layout on a navigation that plainly was one. The proxy therefore
 * copies the one fact under a name of our own.
 *
 * What the render does with it: an Area root that forwards forwards *hard* for a client navigation, and
 * with a status line for a document request. The two are not a preference. A forward serialised into a
 * client navigation that also changes the Area is what the router cannot settle
 * (`browser-test/notes/ANALYSE-area-switch-loop.md`), while a document request wants its 307 so a crawler
 * files a forwarding root as a forward.
 */
export const PHIS_CLIENT_NAVIGATION_HEADER = "x-phis-client-navigation" as const;
