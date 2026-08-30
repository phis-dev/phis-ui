import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { PhiCmsStatus } from "../../../constants/phi-cms";
import type { PhiBlockRuntime } from "../../../types/widget-runtime";
import type { PhiRuntimeModuleCatalog, PhiRuntimeModuleId } from "../../../types";
import type { PhiCmsRoutePresetBinding } from "../../../types/cms-module-descriptors";
import { getCurrentCmsPageDraft, getResolvedCmsPage, getSiteCmsPageCatalog } from "../../../gateway/site-page";
import type { PhiDeveloperBuilderArea, PhiDeveloperBuilderRegionDraft } from "./developer-workspace-types";
import {
  resolvePhiBuilderActivePageCatalog,
  resolvePhiBuilderCmsStoragePathForCatalog,
} from "../../../helpers/cms-page-catalog";
import { buildPhiProjectedBuilderRegionDrafts } from "./draft-background-assets.server";
import { PHI_BUILDER_PAGE_REGION_KEYS } from "./region-keys";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  PHI_BUILDER_PAGE_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
  normalizePhiBuilderPageSearchParam,
} from "../../../helpers/cms-scope-search-params";
import {
  compilePhiCmsActiveRouteTable,
  instantiatePhiCmsRoutePreset,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
  resolvePhiCmsRoutePresetByPageKey,
} from "../../../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import { buildPhiBuilderRuntimeModuleIdsForArea } from "./area-shell-presets.server";

export type PhiBuilderPageDraftsByScope = Partial<
  Record<PhiDeveloperBuilderArea, Partial<Record<string, PhiDeveloperBuilderRegionDraft | null>>>
>;

export type PhiBuilderPageDraftsMapByScope = Partial<
  Record<PhiDeveloperBuilderArea, Partial<Record<string, Record<string, PhiDeveloperBuilderRegionDraft> | null>>>
>;

export type PhiBuilderCurrentPageDrafts = {
  area: PhiDeveloperBuilderArea;
  pageKey: string;
  drafts: Record<string, PhiDeveloperBuilderRegionDraft>;
};

export type PhiBuilderPageMeta = {
  title: string | null;
  description: string | null;
  isDeleted?: boolean;
};

async function resolvePhiRegistryPresetPageBinding({
  runtime,
  runtimeModuleCatalog,
  area,
  pageKey,
}: {
  runtime: PhiBlockRuntime;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  area: PhiDeveloperBuilderArea;
  pageKey: string;
}) {
  const activeModuleIds = await buildPhiBuilderRuntimeModuleIdsForArea(
    runtime,
    area,
    runtimeModuleCatalog,
  );
  const activeModuleKeys = new Set(activeModuleIds);
  if (!runtimeModuleCatalog.platformModuleId) {
    throw new Error("Builder runtime catalog has no Platform contribution.");
  }
  activeModuleKeys.add(runtimeModuleCatalog.platformModuleId);
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const areaDefinition = catalog.areaDefinitions.get(cmsArea);
  if (!areaDefinition) {
    throw new Error(`Builder target Area "${cmsArea}" is not declared.`);
  }
  activeModuleKeys.add(areaDefinition.baseModuleId);
  const binding = resolvePhiCmsRoutePresetByPageKey(
    compilePhiCmsActiveRouteTable({ catalog, area: cmsArea, activeModuleIds: activeModuleKeys }),
    pageKey,
  );
  return binding ? { binding, activeModuleKeys } : null;
}

function buildPhiRegistryPresetPageTree({
  runtime,
  runtimeModuleCatalog,
  binding,
  activeModuleKeys,
  path,
}: {
  runtime: PhiBlockRuntime;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  binding: PhiCmsRoutePresetBinding;
  activeModuleKeys: ReadonlySet<PhiRuntimeModuleId>;
  path: string;
}) {
  return instantiatePhiCmsRoutePreset({
    binding,
    catalog: resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog),
    activeModuleIds: activeModuleKeys,
    siteId: runtime.site.id,
    path,
    runtime,
  });
}

function resolvePresetFetchPath(area: PhiDeveloperBuilderArea, storagePath: string) {
  if (area === "public") {
    return storagePath;
  }
  return storagePath === "/" ? `/${area}` : `/${area}${storagePath}`;
}

const resolvePhiBuilderSitePageStoragePath = cache(async function resolvePhiBuilderSitePageStoragePath({
  apiBaseUrl,
  internalToken,
  siteKey,
  locale,
  cookieHeader,
  area,
  pageKey,
}: {
  apiBaseUrl: string;
  internalToken: string;
  siteKey: string;
  locale: string;
  cookieHeader: string;
  area: PhiDeveloperBuilderArea;
  pageKey: string;
}) {
  const persistedPages = await getSiteCmsPageCatalog({
    apiBaseUrl,
    internalToken,
    siteKey,
    area: resolvePhiBuilderAreaAsCmsArea(area),
    locale,
    cookieHeader,
  });
  const catalog = resolvePhiBuilderActivePageCatalog(
    area,
    { [area]: [] },
    null,
    { [area]: persistedPages },
  );
  return resolvePhiBuilderCmsStoragePathForCatalog(area, pageKey, catalog);
});

const buildPageDraftsForScope = cache(async function buildPageDraftsForScope(
  runtime: PhiBlockRuntime,
  siteKey: string,
  locale: string,
  apiBaseUrl: string,
  internalToken: string,
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<
  Partial<Record<string, Record<string, PhiDeveloperBuilderRegionDraft> | null>>
> {
  const presetResolution = await resolvePhiRegistryPresetPageBinding({
    runtime,
    runtimeModuleCatalog,
    area,
    pageKey,
  });
  const presetBinding = presetResolution?.binding ?? null;
  const cookieHeader = (await cookies()).toString();
  const storagePath = presetBinding?.descriptor.path ??
    await resolvePhiBuilderSitePageStoragePath({
      apiBaseUrl,
      internalToken,
      siteKey,
      locale,
      cookieHeader,
      area,
      pageKey,
    });
  const fetchPath = resolvePresetFetchPath(area, storagePath);
  const sourcePreset = presetBinding
    ? {
        ownerModuleId: presetBinding.descriptor.ownerModuleId,
        presetKey: presetBinding.descriptor.presetKey,
      }
    : null;
  const draftPage = await getCurrentCmsPageDraft({
    apiBaseUrl,
    internalToken,
    siteKey,
    area,
    path: storagePath,
    locale,
    cookieHeader,
    sourcePreset,
  }).catch((error) => {
    throw new Error(
      `Failed to resolve builder draft page for area "${area}" page "${pageKey}" at "${storagePath}".`,
      { cause: error },
    );
  });

  if (draftPage?.page) {
    const drafts = await buildPhiProjectedBuilderRegionDrafts(
      runtime,
      draftPage.page,
      area,
      pageKey,
      PHI_BUILDER_PAGE_REGION_KEYS,
    );
    return {
      [pageKey]: drafts,
    };
  }

  const resolvedPage = await getResolvedCmsPage({
    apiBaseUrl,
    internalToken,
    siteKey,
    path: fetchPath,
    locale,
    cookieHeader,
    sourcePreset,
  }).catch((error) => {
    throw new Error(
      `Failed to resolve builder page for area "${area}" page "${pageKey}" at "${fetchPath}".`,
      { cause: error },
    );
  });

  if (resolvedPage?.page) {
    const drafts = await buildPhiProjectedBuilderRegionDrafts(
      runtime,
      resolvedPage.page,
      area,
      pageKey,
      PHI_BUILDER_PAGE_REGION_KEYS,
    );
    return {
      [pageKey]: drafts,
    };
  }

  const presetTree = presetResolution
    ? await buildPhiRegistryPresetPageTree({
        runtime,
        runtimeModuleCatalog,
        binding: presetResolution.binding,
        activeModuleKeys: presetResolution.activeModuleKeys,
        path: fetchPath,
      })
    : null;

  if (!presetTree) {
    return {
      [pageKey]: null,
    };
  }

  return {
    [pageKey]: await buildPhiProjectedBuilderRegionDrafts(
      runtime,
      presetTree,
      area,
      pageKey,
      PHI_BUILDER_PAGE_REGION_KEYS,
    ),
  };
});

export const buildPhiBuilderPagesDraftsByScope = cache(async function buildPhiBuilderPagesDraftsByScope(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderPageDraftsMapByScope> {
  const { area, pageKey } = await resolvePhiBuilderCurrentPageScope(runtime, runtimeModuleCatalog);

  return {
    [area]: await buildPageDraftsForScope(
      runtime,
      runtime.site.key,
      runtime.locale.current,
      runtime.phis.apiBaseUrl,
      runtime.phis.internalToken,
      area,
      pageKey,
      runtimeModuleCatalog,
    ),
  };
});

export async function resolvePhiBuilderCurrentPageScope(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  const searchParams = runtime.request?.searchParams ?? {};
  const area =
    normalizePhiBuilderAreaSearchParam(searchParams[PHI_BUILDER_AREA_SEARCH_PARAM]) ??
    "public";
  const requestedPageKey = normalizePhiBuilderPageSearchParam(
    searchParams[PHI_BUILDER_PAGE_SEARCH_PARAM],
  );
  if (requestedPageKey) {
    return { area, pageKey: requestedPageKey };
  }

  const activeModuleIds = await buildPhiBuilderRuntimeModuleIdsForArea(
    runtime,
    area,
    runtimeModuleCatalog,
  );
  const activeModuleKeys = new Set(activeModuleIds);
  if (!runtimeModuleCatalog.platformModuleId) {
    throw new Error("Builder runtime catalog has no Platform contribution.");
  }
  activeModuleKeys.add(runtimeModuleCatalog.platformModuleId);
  const cmsArea = resolvePhiBuilderAreaAsCmsArea(area);
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const areaDefinition = catalog.areaDefinitions.get(cmsArea);
  if (!areaDefinition) {
    throw new Error(`Builder target Area "${cmsArea}" is not declared.`);
  }
  activeModuleKeys.add(areaDefinition.baseModuleId);
  const table = compilePhiCmsActiveRouteTable({
    catalog,
    area: cmsArea,
    activeModuleIds: activeModuleKeys,
  });
  const pageKey = resolvePhiCmsRoutePreset(table, "/")?.descriptor.pageKey ??
    table.byPageKey.keys().next().value ??
    "";

  return { area, pageKey };
}

export const buildPhiBuilderCurrentPageDrafts = cache(async function buildPhiBuilderCurrentPageDrafts(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderCurrentPageDrafts> {
  const { area, pageKey } = await resolvePhiBuilderCurrentPageScope(runtime, runtimeModuleCatalog);
  const draftsByPage = await buildPageDraftsForScope(
    runtime,
    runtime.site.key,
    runtime.locale.current,
    runtime.phis.apiBaseUrl,
    runtime.phis.internalToken,
    area,
    pageKey,
    runtimeModuleCatalog,
  );

  return {
    area,
    pageKey,
    drafts: draftsByPage[pageKey] ?? {},
  };
});

async function buildPageMetaForScope(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderPageMeta> {
  const presetResolution = await resolvePhiRegistryPresetPageBinding({
    runtime,
    runtimeModuleCatalog,
    area,
    pageKey,
  });
  const presetBinding = presetResolution?.binding ?? null;
  const cookieHeader = (await cookies()).toString();
  const storagePath = presetBinding?.descriptor.path ??
    await resolvePhiBuilderSitePageStoragePath({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      siteKey: runtime.site.key,
      locale: runtime.locale.current,
      cookieHeader,
      area,
      pageKey,
    });
  const fetchPath = resolvePresetFetchPath(area, storagePath);
  const sourcePreset = presetBinding
    ? {
        ownerModuleId: presetBinding.descriptor.ownerModuleId,
        presetKey: presetBinding.descriptor.presetKey,
      }
    : null;
  const draftPage = await getCurrentCmsPageDraft({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
    area,
    path: storagePath,
    locale: runtime.locale.current,
    cookieHeader,
    sourcePreset,
  }).catch(() => null);

  if (draftPage?.page?.pageMeta) {
    return {
      title: draftPage.page.pageMeta.title?.value ?? null,
      description: draftPage.page.pageMeta.description?.value ?? null,
      isDeleted: draftPage.page.page.status === PhiCmsStatus.Deleted,
    };
  }

  if (draftPage?.page) {
    return {
      title: null,
      description: null,
      isDeleted: draftPage.page.page.status === PhiCmsStatus.Deleted,
    };
  }

  const resolvedPage = await getResolvedCmsPage({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    siteKey: runtime.site.key,
    path: fetchPath,
    locale: runtime.locale.current,
    cookieHeader,
    sourcePreset,
  }).catch(() => null);

  if (resolvedPage?.page?.pageMeta) {
    return {
      title: resolvedPage.page.pageMeta.title?.value ?? null,
      description: resolvedPage.page.pageMeta.description?.value ?? null,
      isDeleted: resolvedPage.page.page.status === PhiCmsStatus.Deleted,
    };
  }

  const presetTree = presetResolution
    ? await buildPhiRegistryPresetPageTree({
        runtime,
        runtimeModuleCatalog,
        binding: presetResolution.binding,
        activeModuleKeys: presetResolution.activeModuleKeys,
        path: fetchPath,
      })
    : null;

  if (!presetTree?.pageMeta) {
    return { title: null, description: null };
  }

  return {
    title: presetTree.pageMeta.title?.value ?? null,
    description: presetTree.pageMeta.description?.value ?? null,
  };
}

export const buildPhiBuilderCurrentPageMeta = cache(async function buildPhiBuilderCurrentPageMeta(
  runtime: PhiBlockRuntime,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderPageMeta> {
  const { area, pageKey } = await resolvePhiBuilderCurrentPageScope(runtime, runtimeModuleCatalog);
  return buildPageMetaForScope(runtime, area, pageKey, runtimeModuleCatalog);
});

export const buildPhiBuilderPageMetaForScope = cache(async function buildPhiBuilderPageMetaForScope(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderPageMeta> {
  return buildPageMetaForScope(runtime, area, pageKey, runtimeModuleCatalog);
});

export const buildPhiBuilderPagePresetDrafts = cache(async function buildPhiBuilderPagePresetDrafts(
  runtime: PhiBlockRuntime,
  area: PhiDeveloperBuilderArea,
  pageKey: string,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
): Promise<PhiBuilderCurrentPageDrafts> {
  const presetResolution = await resolvePhiRegistryPresetPageBinding({
    runtime,
    runtimeModuleCatalog,
    area,
    pageKey,
  });
  const presetTree = presetResolution
    ? await buildPhiRegistryPresetPageTree({
        runtime,
        runtimeModuleCatalog,
        binding: presetResolution.binding,
        activeModuleKeys: presetResolution.activeModuleKeys,
        path: resolvePresetFetchPath(area, presetResolution.binding.descriptor.path),
      })
    : null;

  return {
    area,
    pageKey,
    drafts: presetTree
      ? await buildPhiProjectedBuilderRegionDrafts(
          runtime,
          presetTree,
          area,
          pageKey,
          PHI_BUILDER_PAGE_REGION_KEYS,
        )
      : {},
  };
});
