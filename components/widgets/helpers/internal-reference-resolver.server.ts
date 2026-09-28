import "server-only";

import { resolveSiteInternalReferences } from "../../../gateway/internal-references";
import { resolvePhiCmsRouteDescriptorByPageId } from "../../../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiNavHref } from "../../../helpers/locale";
import { phiRuntime } from "../../../server-helpers/phi-runtime";
import type { PhiCmsAreaKey } from "../../../constants/cms-areas";
import type { PhiBlockRuntime } from "../../../types";
import { readPhiPageReference, type PhiPageReference } from "../../../types/references";

/**
 * Resolves one Asset reference for a Widget that binds a single Asset by id.
 *
 * Uses the same bulk endpoint as the content resolver so there is exactly one Asset resolution path.
 * Returns `null` when the id is not a publicly deliverable Site Space Asset.
 */
export async function resolvePhiPublicAssetReference(input: {
  runtime: Pick<PhiBlockRuntime, "site">;
  assetId: number;
}) {
  const rt = phiRuntime(input.runtime);
  const projection = await resolveSiteInternalReferences({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
    assetIds: [input.assetId],
  });
  return projection.assets.get(input.assetId) ?? null;
}

export async function resolvePhiWidgetInternalReferences(input: {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer">;
  /**
   * Which Area to resolve the Page references in. Absent is the one being rendered.
   *
   * A reference names a Page and not where to look for it, so the Area is the asker's to state -- and
   * an asker that could only ever state its own made a link out of one Area into another resolve to
   * nothing. The Area also decides the address that comes back: a resolved path is Area-prefixed, and
   * prefixing a target's path with the asking Area would point at a Page that is not there.
   */
  area?: PhiCmsAreaKey;
  pageReferences: readonly PhiPageReference[];
  assetIds: readonly number[];
}) {
  const rt = phiRuntime(input.runtime);
  const area = input.area ?? input.runtime.area;
  const pageReferences = [...new Set(input.pageReferences)];
  /**
   * Both sources are Area-relative CMS paths, and `REFERENCES.md` requires the resolved href to be
   * locale- and Area-correct. Navigation already localizes through this helper, so references share
   * it rather than growing a second rule.
   */
  const href = (path: string) =>
    resolvePhiNavHref(input.runtime.locale.current, area, path);
  const projection = await resolveSiteInternalReferences({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
    area,
    references: pageReferences,
    assetIds: input.assetIds,
  });
  const pagePaths = new Map(projection.pages.flatMap((entry) =>
    entry.targetKind === "site" && !entry.deleted && entry.path
      ? [[entry.reference, href(entry.path)] as const]
      : [],
  ));
  /*
   * Absent for an Area this request did not set up, which is every Area but the one being served. A
   * Module Page in another Area therefore does not resolve: the catalogue would give its route, but
   * whether that Module answers in that Area is a fact this request never read, and guessing it is how
   * a link starts pointing at an address nobody serves. A Site Page in another Area is unaffected --
   * the resolver above answered for it.
   */
  const navigationContext = await import("../../../server-helpers/request-runtime")
    .then(({ maybeGetPhiRequestNavigationContext }) => maybeGetPhiRequestNavigationContext(area));
  for (const rawReference of pageReferences) {
    if (!navigationContext || pagePaths.has(rawReference)) continue;
    const { catalog, activeModuleIds } = navigationContext;
    const reference = readPhiPageReference(rawReference);
    if (!reference || reference.target.kind !== "module") continue;
    const route = resolvePhiCmsRouteDescriptorByPageId(catalog, reference.target.pageId);
    // A reference resolves to the address the route has, or to nothing when no Module carries it. Who
    // is reading does not enter: the same reference names the same Page for everybody in the Area.
    if (route && route.area === area && activeModuleIds.has(route.ownerModuleId)) {
      pagePaths.set(reference.reference, href(route.path));
    }
  }

  // The resolver emits only publicly deliverable Site Space Assets, so an absent id is simply not
  // renderable and must not be re-filtered here.
  const assetUrls = new Map([...projection.assets.values()]
    .flatMap((asset) => asset.deliveryUrl ? [[asset.id, asset.deliveryUrl] as const] : []));
  return { pagePaths, assetUrls };
}
