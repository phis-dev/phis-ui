import "server-only";

import { resolveSiteInternalReferences } from "../gateway/internal-references";
import { readPhiAreaRootRoute } from "../helpers/cms-area-config";
import {
  resolvePhiAreaModulePageReferencePath,
  type PhiAreaRootRouteDecision,
} from "../helpers/cms-area-root-route";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import type { PhiBlockRuntime } from "../types";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";
import { readPhiPageReference, type PhiPageReference } from "../types/references";

/**
 * One Page reference, as the Area-relative path it names.
 *
 * Both target kinds resolve here because both can be what a Builder picked: a Page they authored, and
 * a Page a Module carries. Only the first needs the server, and it is asked for one reference rather
 * than folded into the Widget resolver's bulk request -- this runs before any Widget exists.
 */
export async function resolvePhiAreaPageReferencePath({
  runtime,
  reference,
  area,
  catalog,
  activeModuleIds,
}: {
  runtime: PhiBlockRuntime;
  reference: PhiPageReference;
  area: PhiCmsAreaKey;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
}): Promise<string | null> {
  const parsed = readPhiPageReference(reference);
  if (!parsed) {
    return null;
  }
  if (parsed.target.kind === "module") {
    return resolvePhiAreaModulePageReferencePath({
      reference,
      area,
      catalog,
      activeModuleIds,
      viewer: runtime.viewer,
    });
  }

  const projection = await resolveSiteInternalReferences({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
    area,
    references: [reference],
  });
  const entry = projection.pages.find((candidate) => candidate.reference === reference);
  return entry && !entry.deleted && entry.path ? entry.path : null;
}

/**
 * What the configured root route asks of this request.
 *
 * `forward` carries a resolved destination. `page` says the Builder chose a landing page, which is a
 * statement about what the root must *not* do. `null` is the untouched case, where the preset decides
 * -- including when a stored target no longer resolves, which is the case that keeps a Module safe to
 * switch off.
 */
export async function resolvePhiAreaRootRouteDecision({
  config,
  requestedStoragePath,
  runtime,
  area,
  catalog,
  activeModuleIds,
}: {
  config: Record<string, unknown> | null | undefined;
  requestedStoragePath: string | null;
  runtime: PhiBlockRuntime;
  area: PhiCmsAreaKey;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
}): Promise<PhiAreaRootRouteDecision | null> {
  if (requestedStoragePath !== "/") {
    return null;
  }
  const rootRoute = readPhiAreaRootRoute(config);
  if (!rootRoute) {
    return null;
  }
  if (rootRoute.mode === "landing") {
    return { kind: "page" };
  }

  const path = await resolvePhiAreaPageReferencePath({
    runtime,
    reference: rootRoute.target,
    area,
    catalog,
    activeModuleIds,
  });
  // A target that resolves to the root is the root: forwarding there is a loop, and the preset's
  // navigation-derived answer is the better one.
  return path && path !== "/" ? { kind: "forward", path } : null;
}
