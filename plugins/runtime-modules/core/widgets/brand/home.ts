import type { PhiBlockRuntime } from "../../../../../types";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { localizePath } from "../../../../../helpers/locale";
import { readPhiLinkTarget, type PhiResolvedLinkTargets } from "../../../../../types/references";
import type { PhiBrandWidgetHome } from "./client";

/**
 * Where the Brand leads, as an address: the Theme's target, resolved in this render's batch of link
 * targets (`resolvePhiCmsTreeLinkTargets` collects the Brand's beside the tree's), or the Site root.
 *
 * The root is the root in the language being read. `/` alone is answered with a redirect to the
 * visitor's preferred language, so a reader of `/de` could be led to `/en`; and Next's prefetch of it,
 * which loses its `_rsc` on that redirect, came back with the static tree's own address and a 404
 * (AUDIT-2026-10-13, PM15). A target that does not resolve -- a Page deleted, unpublished, or brought by
 * a Module that is switched off -- leads there too: the Brand is the way home and always leads somewhere.
 * A resolved Page path is already locale- and Area-correct (`REFERENCES.md`).
 */
export function resolvePhiBrandWidgetHome(
  runtime: Pick<PhiBlockRuntime, "site" | "locale">,
  links: PhiResolvedLinkTargets | null | undefined,
): PhiBrandWidgetHome {
  return resolvePhiLinkHref(readPhiLinkTarget(runtime.site.theme?.brand?.homeLinkTarget), links)
    ?? { href: localizePath(runtime.locale.current, "/"), newTab: false, external: false };
}
