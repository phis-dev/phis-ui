/**
 * What a Module package needs to resolve a Page target it chose while rendering, and nothing else
 * (REFERENCES.md, "Resolving a target a Widget chose itself").
 *
 * A render's targets are resolved once, before anything draws, from what the stored configs name; a
 * Widget is handed the answers as `links`. A target the Widget decides on while it renders is not among
 * them -- the Search Box leading to the results Page of the Area it stands in, a shop's Basket leading to
 * the cart of that Area -- because no config says it. This is the resolver the render itself uses, for
 * exactly those: one round trip for the targets handed to it, answered per Area as every link is.
 *
 * Narrow for the reason `@phis/ui/module/labels` is: a package outside this one reads it from the Server
 * half every route of the Site imports, and the `server-helpers` barrel would bring `cms-root` and
 * `next/headers` along. The first-party Modules import `server-helpers/cms-link-targets` by its path.
 *
 * Turning an answer into an address is `resolvePhiLinkHref` from `@phis/ui/references`, as for `links`.
 */

import "server-only";

export { resolvePhiLinkTargetReferences } from "./server-helpers/cms-link-targets";
export type { PhiLinkTargetReference } from "./helpers/link-target";
