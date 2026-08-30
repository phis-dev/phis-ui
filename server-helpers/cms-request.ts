import "server-only";

import { cache } from "react";

import {
  resolvePhiCmsAreaKey,
  resolvePhiCmsAreaMask,
  type PhiCmsAreaKey,
} from "../constants/cms-areas";
import type {
  PhiCmsResolvedPageMeta,
  PhiResolvedCmsAreaPresetPayload,
  PhiResolvedCmsPagePayload,
} from "../types/cms";
import type { PhiBlockRuntime } from "../types";
import { canPhiViewerAccess } from "../types/access";
import type {
  PhiResolvedCmsRequest,
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
} from "../types/cms-plugins";
import {
  compilePhiCmsActiveRouteTable,
  instantiatePhiCmsRoutePreset,
  normalizePhiCmsRoutePath,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
  resolvePhiCmsRoutePreset,
} from "../plugins/runtime-modules/descriptor-compiler";
import { readPhiRuntimeModuleIds, resolvePhiRuntimeModuleIdsForArea } from "../plugins/runtime-modules/settings";
import { resolvePhiCmsRoutePage } from "../plugins/runtime-modules/route-page-resolution";
import { resolvePhiRuntimeModuleServerBinding } from "../plugins/runtime-modules/server-capabilities";
import { resolvePhiAuthUiRuntimeProjection } from "../plugins/runtime-modules/auth/ui-provider";
import {
  applyPhiBackgroundAssetProjection,
  resolvePhiBackgroundAssetProjection,
} from "../components/widgets/helpers/background-reference-resolver.server";
import type { PhiServerCapabilitySnapshot } from "../types/server-capabilities";
import { getPhiCmsPage, getPhiExactSiteArea } from "./cms";
import { buildPhiLocalCmsAreaPayload } from "./cms-area";
import {
  resolvePhiCmsReviewParams,
  resolvePhiCmsRevisionFromSearchParams,
  resolvePhiCmsThemeReviewRequestContext,
} from "./cms-review";
import {
  setPhiRequestNavigationContext,
  setPhiRequestRuntime,
} from "./request-runtime";
import {
  buildPhiBlockRuntime,
  loadPhiSiteRequestContext,
  type PhiSiteRequestContext,
} from "./runtime";
import { trForLocale } from "./translate";

type LoadPhiResolvedCmsPage = (
  path: string,
  sourcePreset?: { ownerModuleId: PhiRuntimeModuleId; presetKey: string } | null,
) => Promise<PhiResolvedCmsPagePayload | null>;
type LoadPhiExactSiteArea = (
  path: string,
  sourcePreset: { ownerModuleId: PhiRuntimeModuleId; presetKey: string },
) => Promise<PhiResolvedCmsAreaPresetPayload | null>;

type PhiCmsPresetPageBuildArgs = {
  requestedPath: string;
  areaMask: number;
  siteId: number;
  runtime: PhiBlockRuntime;
};

export type ResolvePhiCmsRequestArgs = {
  siteKey: string;
  locale: string;
  path: string;
  cookieHeader: string;
  apiBaseUrl?: string;
  internalToken?: string;
  requestContext?: PhiSiteRequestContext;
  searchParams?: Record<string, string | undefined>;
  loadResolvedCmsPage: LoadPhiResolvedCmsPage;
  loadExactCmsArea: LoadPhiExactSiteArea;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
};

async function instantiatePhiRoutePresetPage({
  binding,
  requestedPath,
  areaMask,
  siteId,
  runtime,
  runtimeModuleCatalog,
  activeModuleKeys,
}: PhiCmsPresetPageBuildArgs & {
  binding: NonNullable<ReturnType<typeof resolvePhiCmsRoutePreset>>;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  activeModuleKeys: ReadonlySet<PhiRuntimeModuleId>;
}): Promise<PhiResolvedCmsPagePayload | null> {
  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  return {
    areaMask,
    path: requestedPath,
    sourcePreset: {
      ownerModuleId: binding.descriptor.ownerModuleId,
      presetKey: binding.descriptor.presetKey,
      sourcePresetVersion: binding.descriptor.presetVersion,
    },
    page: await instantiatePhiCmsRoutePreset({
      binding,
      catalog,
      activeModuleIds: activeModuleKeys,
      siteId,
      path: requestedPath,
      runtime,
      resolveMissingPageTitle: (sourceTitle) =>
        trForLocale(runtime.locale.current, sourceTitle),
    }),
  };
}

function isAreaRootPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.length === 1 ? segments[0] : null;
}

function resolveAreaMaskFromPath(path: string) {
  const rootArea = isAreaRootPath(path) ?? path.split("/").filter(Boolean)[0] ?? "public";
  return resolvePhiCmsAreaMask(rootArea);
}

function resolveAreaOwnedStoragePath(path: string, areaMask: number) {
  const area = resolvePhiCmsAreaKey(areaMask);
  if (area === "public") {
    return normalizePhiCmsRoutePath(path);
  }
  const areaPrefix = `/${area}`;
  if (path === areaPrefix) {
    return "/";
  }
  if (path.startsWith(`${areaPrefix}/`)) {
    return normalizePhiCmsRoutePath(path.slice(areaPrefix.length));
  }
  return null;
}

export function resolveActivePresetModuleKeys(
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
  area: PhiCmsAreaKey,
  areaPreset: Pick<PhiResolvedCmsAreaPresetPayload, "preset"> | null,
  serverCapabilities: PhiServerCapabilitySnapshot | null,
  viewer?: PhiBlockRuntime["viewer"],
) {
  const platformModuleId = runtimeModuleCatalog.platformModuleId;
  if (!platformModuleId) {
    throw new Error("Runtime module catalog has no Platform contribution.");
  }
  const activeModuleKeys = new Set([platformModuleId]);
  const areaDefinition = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog)
    .areaDefinitions.get(area);
  if (!areaDefinition) {
    throw new Error(`Area "${area}" is not declared in the runtime module catalog.`);
  }
  activeModuleKeys.add(areaDefinition.baseModuleId);
  const configuredModuleKeys = readPhiRuntimeModuleIds(
    areaPreset?.preset.runtimeModuleIds ?? areaPreset?.preset.preset.config.runtimeModules,
  );
  for (const moduleKey of resolvePhiRuntimeModuleIdsForArea(
    area,
    configuredModuleKeys,
    [...runtimeModuleCatalog.values()].map((entry) => entry.definition),
  )) {
    const definition = runtimeModuleCatalog.get(moduleKey)?.definition;
    if (definition) {
      if (viewer && !canPhiViewerAccess(viewer, definition.accessPolicy)) {
        continue;
      }
      const bindingResolution = resolvePhiRuntimeModuleServerBinding(
        definition.serverBinding,
        serverCapabilities,
      );
      if (!bindingResolution.available) {
        console.warn("[phi-runtime-modules] Server capability requirement unavailable.", {
          moduleId: moduleKey,
          providerId: definition.serverBinding.providerId,
          state: bindingResolution.state,
          diagnosticCode: bindingResolution.diagnosticCode,
          missingCapabilities: bindingResolution.missingCapabilities,
        });
        continue;
      }
    }
    activeModuleKeys.add(moduleKey);
  }
  return activeModuleKeys;
}

function mapResolvedPageToRequestedContext(
  pagePayload: PhiResolvedCmsPagePayload,
  areaMask: number,
  path: string,
): PhiResolvedCmsPagePayload {
  return {
    ...pagePayload,
    areaMask,
    path,
    page: {
      ...pagePayload.page,
      page: {
        ...pagePayload.page.page,
        areaMask,
        path,
      },
    },
  };
}

function buildPhiRuntimePage(
  pagePayload: PhiResolvedCmsPagePayload,
): PhiBlockRuntime["page"] {
  const pageMeta: PhiCmsResolvedPageMeta | null | undefined = pagePayload.page.pageMeta;

  return {
    path: pagePayload.page.page.path,
    pageType: pagePayload.page.page.pageType,
    titleMsgId: pagePayload.page.page.titleMsgId,
    descriptionMsgId: pagePayload.page.page.descriptionMsgId,
    title: pageMeta?.title?.value ?? null,
    description: pageMeta?.description?.value ?? null,
  };
}

export async function resolvePhiCmsRequest({
  siteKey,
  locale,
  path,
  cookieHeader,
  apiBaseUrl,
  internalToken,
  requestContext,
  searchParams,
  loadResolvedCmsPage,
  loadExactCmsArea,
  runtimeModuleCatalog,
}: ResolvePhiCmsRequestArgs): Promise<PhiResolvedCmsRequest | null> {
  const areaMask = resolveAreaMaskFromPath(path);
  const baseRequestContext =
    requestContext ??
    (await loadPhiSiteRequestContext(
      siteKey,
      locale,
      cookieHeader,
      apiBaseUrl,
      internalToken,
    ));
  const resolvedRequestContext = await resolvePhiCmsThemeReviewRequestContext({
    requestContext: baseRequestContext,
    searchParams,
    cookieHeader,
  });
  const runtime = buildPhiBlockRuntime({
    requestContext: resolvedRequestContext,
    areaMask,
    request: searchParams ? { searchParams } : undefined,
  });
  setPhiRequestRuntime(runtime);

  const catalog = resolvePhiCmsDescriptorCatalog(runtimeModuleCatalog);
  const requestedAreaKey = resolvePhiCmsAreaKey(areaMask);
  const areaShellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, requestedAreaKey);
  if (!areaShellBinding) {
    throw new Error(`Area "${requestedAreaKey}" has no shell preset binding.`);
  }
  const areaSourcePreset = {
    ownerModuleId: areaShellBinding.descriptor.ownerModuleId,
    presetKey: areaShellBinding.descriptor.presetKey,
  };
  const [exactAreaPreset, localAreaPreset] = await Promise.all([
    loadExactCmsArea(path, areaSourcePreset),
    buildPhiLocalCmsAreaPayload({
      areaMask,
      siteId: resolvedRequestContext.site.id,
      path,
      runtime,
      runtimeModuleCatalog,
    }),
  ]);
  const effectiveAreaPreset = exactAreaPreset ?? localAreaPreset;
  const siteId = localAreaPreset?.preset.preset.siteId ?? resolvedRequestContext.site.id;
  const areaOwnedStoragePath = resolveAreaOwnedStoragePath(path, areaMask);
  const activeModuleKeys = resolveActivePresetModuleKeys(
    runtimeModuleCatalog,
    requestedAreaKey,
    effectiveAreaPreset,
    resolvedRequestContext.serverCapabilities,
    runtime.viewer,
  );
  const runtimeWithAuthProvider: PhiBlockRuntime = {
    ...runtime,
    authUiProvider: resolvePhiAuthUiRuntimeProjection(
      runtimeModuleCatalog,
      activeModuleKeys,
      requestedAreaKey,
    ),
  };
  setPhiRequestRuntime(runtimeWithAuthProvider);
  setPhiRequestNavigationContext(requestedAreaKey, catalog, activeModuleKeys);
  const areaAllowed = canPhiViewerAccess(runtime.viewer, areaShellBinding.descriptor.area === requestedAreaKey
    ? catalog.areaDefinitions.get(requestedAreaKey)?.accessPolicy
    : undefined);
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog,
    area: requestedAreaKey,
    activeModuleIds: activeModuleKeys,
    viewer: runtime.viewer,
  });
  const routeBinding = areaOwnedStoragePath && areaAllowed
    ? resolvePhiCmsRoutePreset(routeTable, areaOwnedStoragePath)
    : null;
  const resolvedPage = await resolvePhiCmsRoutePage({
    binding: routeBinding,
    requestedPath: path,
    loadPage: loadResolvedCmsPage,
    instantiatePreset: (binding) => instantiatePhiRoutePresetPage({
      binding,
      requestedPath: path,
      areaMask,
      siteId,
      runtime: runtimeWithAuthProvider,
      runtimeModuleCatalog,
      activeModuleKeys,
    }),
  });

  const accessiblePage =
    resolvedPage &&
    canPhiViewerAccess(runtime.viewer, resolvedPage.page.page.accessPolicy)
      ? resolvedPage
      : null;
  const effectivePage = accessiblePage
    ? mapResolvedPageToRequestedContext(accessiblePage, areaMask, path)
    : null;

  const resolvedContent = effectivePage;
  if (!resolvedContent) {
    return null;
  }

  const resolvedRuntime: PhiBlockRuntime = {
    ...runtimeWithAuthProvider,
    page: buildPhiRuntimePage(resolvedContent),
  };
  setPhiRequestRuntime(resolvedRuntime);

  // Asset-bound Backgrounds get their delivery projection here, in one bulk request across both
  // trees, so a Region or Layout draws the same crop the Image Widget would -- including after a
  // focal change invalidated the generated variant. The Area preset carries the shell Header and
  // Hero Backgrounds, so leaving it out would miss the ones a visitor actually sees.
  const areaPresetTree = effectiveAreaPreset?.preset ?? null;
  const backgroundAssets = await resolvePhiBackgroundAssetProjection({
    runtime: resolvedRuntime,
    trees: [resolvedContent.page, areaPresetTree],
  });

  return {
    areaPreset: areaPresetTree && applyPhiBackgroundAssetProjection(areaPresetTree, backgroundAssets),
    page: applyPhiBackgroundAssetProjection(resolvedContent.page, backgroundAssets),
    runtime: resolvedRuntime,
    serverCapabilities: resolvedRequestContext.serverCapabilities,
  };
}

export const loadPhiResolvedCmsRequest = cache(async function loadPhiResolvedCmsRequest(
  siteKey: string,
  locale: string,
  path: string,
  cookieHeader: string,
  apiBaseUrl: string | undefined,
  internalToken: string | undefined,
  requestContext: PhiSiteRequestContext | undefined,
  searchParams: Record<string, string | undefined> | undefined,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
) {
  const revision = resolvePhiCmsRevisionFromSearchParams(searchParams);
  const review = resolvePhiCmsReviewParams(searchParams);
  return resolvePhiCmsRequest({
    siteKey,
    locale,
    path,
    cookieHeader,
    apiBaseUrl,
    internalToken,
    requestContext,
    searchParams,
    runtimeModuleCatalog,
    loadExactCmsArea: (requestPath, sourcePreset) =>
      getPhiExactSiteArea({
        path: requestPath,
        siteKey,
        apiBaseUrl,
        internalToken,
        revision,
        review,
        cookieHeader,
        sourcePreset,
      }),
    loadResolvedCmsPage: (requestPath, sourcePreset) =>
      getPhiCmsPage({
        path: requestPath,
        siteKey,
        apiBaseUrl,
        internalToken,
        revision,
        review,
        cookieHeader,
        sourcePreset,
      }),
  });
});
