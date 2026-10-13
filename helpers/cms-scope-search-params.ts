import { isPhiBuilderAreaKey, type PhiBuilderAreaKey } from "../constants/cms-areas";
import type { PhiRuntimeModuleId } from "../types/cms-plugins";
import { readPhiRuntimeModuleIds } from "../plugins/runtime-modules/settings";

export const PHI_BUILDER_AREA_SEARCH_PARAM = "phiBuilderArea";
export const PHI_BUILDER_PAGE_SEARCH_PARAM = "phiBuilderPage";
export const PHI_BUILDER_NAVIGATION_KEY_SEARCH_PARAM = "navKey";
export const PHI_BUILDER_REVISIONS_KIND_SEARCH_PARAM = "revisionKind";
export const PHI_BUILDER_REVISIONS_SCOPE_SEARCH_PARAM = "revisionScope";
export const PHI_BUILDER_THEME_KEY_SEARCH_PARAM = "themeKey";
export const PHI_BUILDER_RUNTIME_MODULES_SEARCH_PARAM = "phiBuilderModules";

export function normalizePhiBuilderAreaSearchParam(value: unknown): PhiBuilderAreaKey | null {
  return isPhiBuilderAreaKey(value) ? value : null;
}

export function normalizePhiBuilderPageSearchParam(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function serializePhiBuilderRuntimeModuleIdsSearchParam(
  moduleIds: readonly PhiRuntimeModuleId[],
) {
  return JSON.stringify(moduleIds);
}

export function normalizePhiBuilderRuntimeModuleIdsSearchParam(
  value: unknown,
): PhiRuntimeModuleId[] | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  try {
    return readPhiRuntimeModuleIds(JSON.parse(value));
  } catch {
    return null;
  }
}

/** What a revision can be the revision of -- the one list the review route and the Revisions page read. */
export const PHI_CMS_REVIEW_KINDS = ["area", "page", "navigation", "theme"] as const;
export type PhiCmsReviewKind = (typeof PHI_CMS_REVIEW_KINDS)[number];

export function isPhiCmsReviewKind(value: unknown): value is PhiCmsReviewKind {
  return (PHI_CMS_REVIEW_KINDS as readonly unknown[]).includes(value);
}

export function normalizePhiBuilderRevisionsKindSearchParam(value: unknown): PhiCmsReviewKind | null {
  return isPhiCmsReviewKind(value) ? value : null;
}
