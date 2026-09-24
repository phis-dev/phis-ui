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
import { resolvePhiRuntimeModuleIdsForArea } from "../plugins/runtime-modules/settings";
import { resolvePhiCmsRoutePage } from "../plugins/runtime-modules/route-page-resolution";
import { PhiCmsFlags } from "../constants/phi-cms";
import { hasPhiFlag } from "../helpers/flags";
import { resolvePhiRuntimeModuleServerBinding } from "../plugins/runtime-modules/server-capabilities";
import { resolvePhiAuthUiRuntimeProjection } from "../plugins/runtime-modules/auth/ui-provider";
import {
  applyPhiBackgroundAssetProjection,
  resolvePhiBackgroundAssetProjection,
} from "../components/widgets/helpers/background-reference-resolver.server";
import type { PhiCapabilitySnapshot } from "../types/server-capabilities";
import { getPhiCmsPage, getPhiExactSiteArea } from "./cms";
import { buildPhiLocalCmsAreaPayload } from "./cms-area";
import { resolvePhiAreaPageReferencePath, resolvePhiAreaRootRouteDecision } from "./area-root-route";
import { fetchSiteNavigationFolderTarget } from "../gateway/site-nav";
import type { PhiPageReference } from "../types/references";
import { applyPhiAreaRootRouteDecision, buildPhiFolderAddressRedirectPage } from "../helpers/cms-area-root-route";
import {
  resolvePhiCmsReviewParams,
  resolvePhiCmsRevisionFromSearchParams,
  resolvePhiCmsThemeReviewRequestContext,
} from "./cms-review";
import {
  maybeGetPhiRequestRuntime,
  setPhiRequestNavigationContext,
  setPhiRequestRuntime,
} from "./request-runtime";
import {
  buildPhiBlockRuntime,
  loadPhiSiteRequestContext,
  type PhiSiteRequestContext,
} from "./runtime";
import { trForLocale } from "./translate";
import {
  readPhiAreaLandingSelection,
  readPhiAreaPresetRuntimeModuleIds,
  readPhiAreaPublicRoutePaths,
} from "../helpers/cms-area-config";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";

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
  area: PhiCmsAreaKey;
  path: string;
  cookieHeader: string;
  apiBaseUrl?: string;
  internalToken?: string;
  requestContext?: PhiSiteRequestContext;
  searchParams?: Record<string, string | undefined>;
  loadResolvedCmsPage: LoadPhiResolvedCmsPage;
  loadExactCmsArea: LoadPhiExactSiteArea;
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  /**
   * `"render"` resolves the request being answered: it binds the request-scoped runtime and
   * navigation context and projects Background assets for drawing. `"lookup"` peeks at what another
   * path would resolve to -- the same routing, access and root-route decisions -- without touching
   * request state and without asset work, and returns once the Page is decided. Anything rendered
   * from a lookup result would draw unprojected Backgrounds; a lookup is for reading the Page node.
   *
   * `"refusal"` resolves a `not-found`, `unauthorized` or `forbidden` tree, which Next renders beside
   * the Page of every matched route whether it is shown or not. It draws like a render, but it binds
   * the request-scoped state only when nothing else has: the refusal is not the address that was
   * asked for, and its `/error/...` path resolves no Area preset, so claiming the request would hand
   * the Shell the default Module selection instead of the Site's own. A refusal raised above every
   * Area layout has no Page beside it, and there it does claim.
   */
  purpose?: "render" | "lookup" | "refusal";
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
  serverCapabilities: PhiCapabilitySnapshot | null,
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
  const configuredModuleKeys = readPhiAreaPresetRuntimeModuleIds(areaPreset?.preset, area);
  for (const moduleKey of resolvePhiRuntimeModuleIdsForArea(
    area,
    configuredModuleKeys,
    [...runtimeModuleCatalog.values()].map((entry) => entry.definition),
  )) {
    const definition = runtimeModuleCatalog.get(moduleKey)?.definition;
    if (definition) {
      // A Module is on for an Area or it is not. It is never switched off for one reader (ACCESS.md):
      // what its Widgets show may differ per person, that it is loaded may not.
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
    noindex: hasPhiFlag(pagePayload.page.page.flags, PhiCmsFlags.NoIndex),
  };
}

export async function resolvePhiCmsRequest({
  siteKey,
  locale,
  area,
  path,
  cookieHeader,
  apiBaseUrl,
  internalToken,
  requestContext,
  searchParams,
  loadResolvedCmsPage,
  loadExactCmsArea,
  runtimeModuleCatalog,
  purpose = "render",
}: ResolvePhiCmsRequestArgs): Promise<PhiResolvedCmsRequest | null> {
  const areaMask = resolvePhiCmsAreaMask(area);
  /*
   * Whether this resolution speaks for the request.
   *
   * A refusal boundary does so only where nothing has been resolved at all, which is the root refusal
   * route with no Area layout above it. The test is the request's runtime rather than its Area: a
   * refusal answers in Public whichever Area caught it, so asking whether *that* Area is spoken for
   * would let a Public refusal claim an App request.
   */
  const ownsRequestState = purpose === "render"
    || (purpose === "refusal" && !maybeGetPhiRequestRuntime());
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
  if (ownsRequestState) {
    setPhiRequestRuntime(runtime);
  }

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
  );
  const runtimeWithAuthProvider: PhiBlockRuntime = {
    ...runtime,
    authUiProvider: resolvePhiAuthUiRuntimeProjection(
      runtimeModuleCatalog,
      activeModuleKeys,
      requestedAreaKey,
    ),
  };
  if (ownsRequestState) {
    setPhiRequestRuntime(runtimeWithAuthProvider);
    setPhiRequestNavigationContext(requestedAreaKey, catalog, activeModuleKeys);
  }
  const areaAllowed = canPhiViewerAccess(runtime.viewer, areaShellBinding.descriptor.area === requestedAreaKey
    ? catalog.areaDefinitions.get(requestedAreaKey)?.accessPolicy
    : undefined);
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog,
    area: requestedAreaKey,
    activeModuleIds: activeModuleKeys,
    publicRoutePaths: readPhiAreaPublicRoutePaths(effectiveAreaPreset?.preset.preset.config),
    landingSelection: readPhiAreaLandingSelection(effectiveAreaPreset?.preset.preset.config),
  });
  const routeBinding = areaOwnedStoragePath && areaAllowed
    ? resolvePhiCmsRoutePreset(routeTable, areaOwnedStoragePath)
    : null;
  const loadedPage = await resolvePhiCmsRoutePage({
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

  /*
   * The Area root, as the Builder configured it.
   *
   * It is read here rather than inside the preset because the preset is the fallback: with nothing
   * stored, or with a stored target that no longer resolves, the code-owned root route answers and
   * forwards to the first entry of the Area's own navigation.
   */
  const rootRouteDecision = loadedPage && areaAllowed
    ? await resolvePhiAreaRootRouteDecision({
        config: effectiveAreaPreset?.preset.preset.config,
        requestedStoragePath: areaOwnedStoragePath,
        runtime: runtimeWithAuthProvider,
        area: requestedAreaKey,
        catalog,
        activeModuleIds: activeModuleKeys,
      })
    : null;
  /*
   * A folder address, asked only where no Page answers: a path such as `/docs` that is no Page may still be
   * a folder whose Navigation container leads to one. The server follows the published Navigations to a
   * Page reference, and the reference is resolved here, where Module routes are known.
   */
  const folderTargetReference = !loadedPage && areaAllowed && areaOwnedStoragePath && areaOwnedStoragePath !== "/"
    ? await fetchSiteNavigationFolderTarget({
        apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
        internalToken: readPhiServerApiCredentials().internalToken,
        siteKey: runtimeWithAuthProvider.site.key,
        area: requestedAreaKey,
        path: areaOwnedStoragePath,
      })
    : null;
  const folderTargetPath = folderTargetReference
    ? await resolvePhiAreaPageReferencePath({
        runtime: runtimeWithAuthProvider,
        reference: folderTargetReference as PhiPageReference,
        area: requestedAreaKey,
        catalog,
        activeModuleIds: activeModuleKeys,
      })
    : null;
  const folderRedirectPage = folderTargetPath && folderTargetPath !== areaOwnedStoragePath
    ? buildPhiFolderAddressRedirectPage({
        siteId,
        areaMask,
        area: requestedAreaKey,
        path,
        targetPath: folderTargetPath,
      })
    : null;
  const resolvedPage = loadedPage && rootRouteDecision
    ? applyPhiAreaRootRouteDecision(loadedPage, rootRouteDecision, requestedAreaKey)
    : loadedPage ?? folderRedirectPage;

  /*
   * The Page a request resolved to, whoever asked.
   *
   * There is no viewer here and there must not be: an address answers the same Page for everybody the
   * Area let in (ACCESS.md). A Module that may not show this person what the Page holds answers that
   * inside the Page -- in its own tree loader, with what it is willing to show -- and its data refuses
   * server-side regardless of what was rendered. Deciding it here instead made the address itself
   * disappear, which is a different and much larger claim.
   */
  const effectivePage = resolvedPage
    ? mapResolvedPageToRequestedContext(resolvedPage, areaMask, path)
    : null;

  const resolvedContent = effectivePage;
  if (!resolvedContent) {
    return null;
  }

  const resolvedRuntime: PhiBlockRuntime = {
    ...runtimeWithAuthProvider,
    page: buildPhiRuntimePage(resolvedContent),
  };
  if (purpose === "lookup") {
    return {
      areaPreset: effectiveAreaPreset?.preset ?? null,
      page: resolvedContent.page,
      runtime: resolvedRuntime,
      serverCapabilities: resolvedRequestContext.serverCapabilities,
    };
  }
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
  area: PhiCmsAreaKey,
  path: string,
  cookieHeader: string,
  apiBaseUrl: string | undefined,
  internalToken: string | undefined,
  requestContext: PhiSiteRequestContext | undefined,
  searchParams: Record<string, string | undefined> | undefined,
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
  purpose: ResolvePhiCmsRequestArgs["purpose"] = "render",
) {
  const revision = resolvePhiCmsRevisionFromSearchParams(searchParams);
  const review = resolvePhiCmsReviewParams(searchParams);
  return resolvePhiCmsRequest({
    siteKey,
    locale,
    area,
    path,
    cookieHeader,
    apiBaseUrl,
    internalToken,
    requestContext,
    searchParams,
    purpose,
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
