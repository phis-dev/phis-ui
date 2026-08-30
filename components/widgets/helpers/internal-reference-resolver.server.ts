import "server-only";

import { resolveSiteInternalReferences } from "../../../gateway/internal-references";
import { resolvePhiCmsRoutePresetByIdentity } from "../../../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiNavHref } from "../../../helpers/locale";
import { phiRuntime } from "../../../server-helpers/phi-runtime";
import type { PhiBlockRuntime } from "../../../types";
import { canPhiViewerAccess } from "../../../types/access";
import { readPhiPageReference, type PhiPageReference } from "../../../types/references";

/**
 * Resolves one Asset reference for a Widget that binds a single Asset by id.
 *
 * Uses the same bulk endpoint as the content resolver so there is exactly one Asset resolution path.
 * Returns `null` when the id is not a publicly deliverable Site Space Asset.
 */
export async function resolvePhiPublicAssetReference(input: {
  runtime: Pick<PhiBlockRuntime, "site" | "phis">;
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
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer">;
  pageReferences: readonly PhiPageReference[];
  assetIds: readonly number[];
}) {
  const rt = phiRuntime(input.runtime);
  const pageReferences = [...new Set(input.pageReferences)];
  /**
   * Both sources are Area-relative CMS paths, and `REFERENCES.md` requires the resolved href to be
   * locale- and Area-correct. Navigation already localizes through this helper, so references share
   * it rather than growing a second rule.
   */
  const href = (path: string) =>
    resolvePhiNavHref(input.runtime.locale.current, input.runtime.area, path);
  const projection = await resolveSiteInternalReferences({
    apiBaseUrl: rt.apiBaseUrl,
    internalToken: rt.internalToken,
    siteKey: rt.siteKey,
    area: input.runtime.area,
    references: pageReferences,
    assetIds: input.assetIds,
  });
  const pagePaths = new Map(projection.pages.flatMap((entry) =>
    entry.targetKind === "site" && !entry.deleted && entry.path
      ? [[entry.reference, href(entry.path)] as const]
      : [],
  ));
  const { catalog, activeModuleIds } = await import("../../../server-helpers/request-runtime")
    .then(({ getPhiRequestNavigationContext }) => getPhiRequestNavigationContext(input.runtime.area));
  for (const rawReference of pageReferences) {
    if (pagePaths.has(rawReference)) continue;
    const reference = readPhiPageReference(rawReference);
    if (!reference || reference.target.kind !== "module") continue;
    const route = resolvePhiCmsRoutePresetByIdentity(
      catalog,
      reference.target.ownerModuleId as `${string}/${string}`,
      reference.target.presetKey,
    );
    if (
      route && route.area === input.runtime.area && activeModuleIds.has(route.ownerModuleId) &&
      canPhiViewerAccess(input.runtime.viewer, route.accessPolicy)
    ) {
      pagePaths.set(reference.reference, href(route.path));
    }
  }

  // The resolver emits only publicly deliverable Site Space Assets, so an absent id is simply not
  // renderable and must not be re-filtered here.
  const assetUrls = new Map([...projection.assets.values()]
    .flatMap((asset) => asset.deliveryUrl ? [[asset.id, asset.deliveryUrl] as const] : []));
  return { pagePaths, assetUrls };
}
