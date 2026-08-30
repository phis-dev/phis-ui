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

export function normalizePhiBuilderRevisionsKindSearchParam(
  value: unknown,
): "area" | "page" | "navigation" | "theme" | null {
  return value === "area" || value === "page" || value === "navigation" || value === "theme" ? value : null;
}
