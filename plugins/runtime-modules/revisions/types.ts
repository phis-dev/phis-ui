import { resolvePhiBuilderAreaAsCmsArea, type PhiBuilderAreaKey, type PhiCmsAreaKey } from "../../../constants/cms-areas";
import { normalizePhiBuilderCmsCatalogPath } from "../../../helpers/cms-page-catalog";
import { resolvePhiBuilderCmsStoragePath } from "../../../helpers/cms-paths";
import type { PhiPresetPageNode } from "../../../helpers/cms-page-catalog";
import { resolvePhiBuilderPagePresetSource } from "../../../helpers/cms-page-catalog";
import type { PhiCmsPresetSource } from "../../../types/cms-module-descriptors";
import {
  parsePhiBuilderNavigationScopeKey,
} from "../../../helpers/cms-navigation-catalog";

export type PhiBuilderRevisionKind = "area" | "page" | "navigation" | "theme";

export type PhiBuilderRevisionScope = {
  kind: PhiBuilderRevisionKind;
  area: PhiCmsAreaKey;
  path: string | null;
  navKey: string | null;
  themeKey: string | null;
  sourcePreset: PhiCmsPresetSource | null;
};

export type PhiBuilderRevisionHistoryRow = {
  revisionId: number;
  createdAt: string;
  createdByUserId: number | null;
  createdByLabel: string | null;
  message: string | null;
  meta?: Record<string, unknown>;
  sourceRevisionId: number | null;
  isPublished: boolean;
  isWorkingDraft: boolean;
  isDeleted?: boolean;
  sourcePreset?: PhiCmsPresetSource | null;
};

export type PhiBuilderRevisionHistoryResponse = {
  kind: PhiBuilderRevisionKind;
  scope: {
    area: string;
    path: string | null;
    navKey: string | null;
    themeKey: string | null;
  };
  current: {
    publishedRevisionId: number | null;
    workingDraftRevisionId: number | null;
  };
  rows: PhiBuilderRevisionHistoryRow[];
};

export type PhiBuilderRevisionRestoreResponse = {
  kind: PhiBuilderRevisionKind;
  scope: {
    area: string;
    path: string | null;
    navKey: string | null;
    themeKey: string | null;
  };
  restoredFromRevisionId: number;
  revisionId: number;
};

export type PhiBuilderRevisionDeleteResponse = {
  kind: PhiBuilderRevisionKind;
  scope: {
    area: string;
    path: string | null;
    navKey: string | null;
    themeKey: string | null;
  };
  revisionId?: number;
  revisionIds?: number[];
  deleted?: boolean;
  deletedCount?: number;
};

export function resolvePhiBuilderRevisionScope(
  kind: PhiBuilderRevisionKind,
  area: PhiBuilderAreaKey,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
  navigationScopeKey: string,
  themeKey = "default",
  areaPresetSource: PhiCmsPresetSource | null = null,
): PhiBuilderRevisionScope {
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  if (kind === "area") {
    return {
      kind,
      area: cmsArea,
      path: null,
      navKey: null,
      themeKey: null,
      sourcePreset: areaPresetSource,
    };
  }

  if (kind === "page") {
    const sourcePreset = resolvePhiBuilderPagePresetSource(pageKey, pages);
    return {
      kind,
      area: cmsArea,
      path: sourcePreset ? null : resolvePhiBuilderRevisionPagePath(area, pageKey, pages),
      navKey: null,
      themeKey: null,
      sourcePreset,
    };
  }

  if (kind === "theme") {
    return {
      kind,
      area: cmsArea,
      path: null,
      navKey: null,
      themeKey: themeKey.trim() || "default",
      sourcePreset: null,
    };
  }

  return {
    kind,
    area: cmsArea,
    path: null,
    navKey: parsePhiBuilderNavigationScopeKey(navigationScopeKey)?.key ?? null,
    themeKey: null,
    sourcePreset: null,
  };
}

export function resolvePhiBuilderRevisionPagePath(
  area: PhiBuilderAreaKey,
  pageKey: string,
  pages: readonly PhiPresetPageNode[],
) {
  const normalizedPageKey = pageKey.trim();
  if (normalizedPageKey === "/" || normalizedPageKey.includes("/")) {
    return normalizePhiBuilderCmsCatalogPath(normalizedPageKey);
  }

  return resolvePhiBuilderCmsStoragePath(area, normalizedPageKey, pages);
}
