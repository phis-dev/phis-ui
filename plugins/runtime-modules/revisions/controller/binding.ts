import { isPhiBuilderAreaKey, type PhiBuilderAreaKey } from "../../../../constants/cms-areas";
import type { PhiWorkspaceCatalogState } from "../../../../components/workspace/catalog-state";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM,
  PHI_BUILDER_PAGE_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM,
  PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM,
  PHI_BUILDER_THEME_KEY_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
  normalizePhiBuilderPageSearchParam,
  normalizePhiBuilderRevisionsKindSearchParam,
  type PhiCmsReviewKind,
} from "../../../../helpers/cms-scope-search-params";
import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderActivePageKey,
} from "../../../../helpers/cms-page-catalog";
import { resolvePhiBuilderRevisionNavScopeKey } from "../../../../helpers/cms-navigation-scope-key";
import { resolvePhiBuilderRevisionPagePath } from "../types";
import { isPhiRecord } from "../../../../helpers/is-record";

/** The scope the Revisions Controller hands the history Table: the one binding the Table reads by. */
export type PhiRevisionsTableBinding = {
  area: PhiBuilderAreaKey;
  kind: PhiCmsReviewKind;
  scopeKey: string;
};

type CatalogState = Pick<
  PhiWorkspaceCatalogState,
  "area" | "pageKey" | "catalogHydrated" | "pageCatalogHydratedByArea" |
  "modulePresetPagesByArea" | "customPages" | "persistedPageCatalogByArea"
>;

/**
 * Whether the workspace catalog stands for the Area the address names.
 *
 * Before the Builder has read the address, the catalog answers its default Area (`public`) with whatever
 * it holds of it; a scope resolved then belongs to another Area -- a Module Page of the App was asked for
 * as a Public Page and, handed to the Table, written back into the address as the Public Area. So nothing
 * is resolved until the preload is in, the open Area is the one the address names, and its Pages are read.
 */
export function isPhiRevisionsCatalogReady(state: CatalogState, search: URLSearchParams) {
  if (!state.catalogHydrated || state.pageCatalogHydratedByArea[state.area] !== true) return false;
  const area = normalizePhiBuilderAreaSearchParam(search.get(PHI_BUILDER_AREA_SEARCH_PARAM));
  return area == null || area === state.area;
}

/** The kind the address names, the Area where it names none. */
export function readPhiRevisionsAddressKind(search: URLSearchParams): PhiCmsReviewKind {
  return normalizePhiBuilderRevisionsKindSearchParam(search.get(PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM)) ?? "area";
}

/**
 * The scope the address names, resolved against the workspace catalog -- or null while the catalog does
 * not stand for that address yet (`isPhiRevisionsCatalogReady`), which is a moment, not a fault.
 */
export function resolvePhiRevisionsControllerBinding(
  state: CatalogState,
  search: URLSearchParams,
): PhiRevisionsTableBinding | null {
  if (!isPhiRevisionsCatalogReady(state, search)) return null;
  const pages = resolvePhiBuilderActivePageCatalog(
    state.area,
    state.modulePresetPagesByArea,
    state.customPages,
    state.persistedPageCatalogByArea,
  );
  const pageKey = resolvePhiBuilderActivePageKey(
    normalizePhiBuilderPageSearchParam(search.get(PHI_BUILDER_PAGE_SEARCH_PARAM)) ?? state.pageKey,
    pages,
  );
  if (!pageKey) return null;
  const kind = readPhiRevisionsAddressKind(search);
  const requestedScope = search.get(PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM)?.trim() ?? "";
  const scopeKey = kind === "page"
    ? requestedScope.startsWith("/")
      ? requestedScope
      : resolvePhiBuilderRevisionPagePath(state.area, pageKey, pages)
    : kind === "navigation"
      ? requestedScope.includes(":")
        ? requestedScope
        : resolvePhiBuilderRevisionNavScopeKey(state.area, search.get(PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM))
      : kind === "theme"
        ? requestedScope || search.get(PHI_BUILDER_THEME_KEY_SEARCH_PARAM) || "default"
        : normalizePhiBuilderAreaSearchParam(requestedScope) ?? state.area;
  return { area: state.area, kind, scopeKey };
}

/**
 * The binding a Table request carries, when it carries a whole one.
 *
 * The history Table mounts with its labels and nothing to ask about; the Controller hands it the scope
 * once the catalog stands for the address. Until then -- and while a kind chosen in the Table's own
 * select still stands beside the scope of the kind before it, until the scope select answers -- there is
 * no question, and a request that asked one anyway asked for the wrong history and was thrown away a
 * moment later: the flicker of the Table on every open.
 */
export function readPhiRevisionsTableBinding(params: unknown): PhiRevisionsTableBinding | null {
  if (!isPhiRecord(params) || !isPhiBuilderAreaKey(params.area)) return null;
  const kind = normalizePhiBuilderRevisionsKindSearchParam(params.kind);
  const scopeKey = typeof params.scopeKey === "string" ? params.scopeKey.trim() : "";
  if (!kind || !scopeKey) return null;
  const fits = kind === "area"
    ? isPhiBuilderAreaKey(scopeKey)
    : kind === "page"
      ? scopeKey.startsWith("/")
      : kind === "navigation"
        ? scopeKey.includes(":")
        : !isPhiBuilderAreaKey(scopeKey);
  return fits ? { area: params.area, kind, scopeKey } : null;
}
