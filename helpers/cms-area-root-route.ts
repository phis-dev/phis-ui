import type { PhiCmsAreaKey } from "../constants/cms-areas";
import { PhiCmsPageType } from "../constants/phi-cms";
import { resolvePhiCmsRoutePresetByIdentity } from "../plugins/runtime-modules/descriptor-compiler";
import type { PhiBlockRuntime } from "../types";
import { canPhiViewerAccess } from "../types/access";
import type { PhiResolvedCmsPageTree } from "../types/cms";
import type {
  PhiCmsCompiledDescriptorCatalog,
  PhiRuntimeModuleId,
} from "../types/cms-module-descriptors";
import { readPhiPageReference, type PhiPageReference } from "../types/references";

/**
 * The Area root, as the Builder configured it.
 *
 * `preset.config.shell.rootRoute` is the Builder's answer; this is the part of reading it that needs
 * no request. What is decided here is only ever an override: with nothing stored, or with a stored
 * target that no longer resolves, the code-owned preset answers instead and forwards to the first
 * entry of the Area's own navigation. That is what makes a Module safe to switch off -- the front door
 * moves rather than breaking -- and it is why a target is stored as a Page reference, not as a path.
 */

export type PhiAreaRootRouteDecision =
  | { kind: "forward"; path: string }
  | { kind: "page" };

/**
 * A reference to a Page a Module carries, as the Area-relative path it names.
 *
 * Checked against this Area, this Module selection and this viewer, so a reference to a route that is
 * no longer reachable resolves to nothing rather than to a path that answers 404. A Site-authored Page
 * cannot be resolved without asking the server and is handled by the caller.
 */
export function resolvePhiAreaModulePageReferencePath({
  reference,
  area,
  catalog,
  activeModuleIds,
  viewer,
}: {
  reference: PhiPageReference;
  area: PhiCmsAreaKey;
  catalog: PhiCmsCompiledDescriptorCatalog;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  viewer: PhiBlockRuntime["viewer"];
}): string | null {
  const parsed = readPhiPageReference(reference);
  if (parsed?.target.kind !== "module") {
    return null;
  }
  const route = resolvePhiCmsRoutePresetByIdentity(
    catalog,
    parsed.target.ownerModuleId as PhiRuntimeModuleId,
    parsed.target.presetKey,
  );
  return route &&
    route.area === area &&
    activeModuleIds.has(route.ownerModuleId) &&
    canPhiViewerAccess(viewer, route.accessPolicy)
    ? route.path
    : null;
}

/**
 * The decision, applied to whatever the ordinary resolution produced.
 *
 * It runs after the page rather than instead of it so the Area's own bookkeeping -- which preset the
 * page came from, its access policy, its resolved title -- survives a configured root route. What
 * changes is only what the page does: `forward` replaces the body with a redirect, and `page` strips
 * one, because a Builder who chose a landing page chose that the root does not forward.
 */
export function applyPhiAreaRootRouteDecision<
  TPayload extends { page: PhiResolvedCmsPageTree },
>(
  payload: TPayload,
  decision: PhiAreaRootRouteDecision,
  area: PhiCmsAreaKey,
): TPayload {
  if (decision.kind === "forward") {
    return {
      ...payload,
      page: {
        ...payload.page,
        page: {
          ...payload.page.page,
          pageType: PhiCmsPageType.Redirect,
          layoutConfig: {
            ...payload.page.page.layoutConfig,
            redirect: { target: { area, path: decision.path }, status: 307 },
          },
        },
      },
    };
  }

  if (payload.page.page.pageType !== PhiCmsPageType.Redirect) {
    return payload;
  }
  const layoutConfig = { ...payload.page.page.layoutConfig };
  delete layoutConfig.redirect;
  return {
    ...payload,
    page: {
      ...payload.page,
      page: { ...payload.page.page, pageType: PhiCmsPageType.Standard, layoutConfig },
    },
  };
}
