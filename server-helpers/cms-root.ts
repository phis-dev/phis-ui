import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";

import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import type { PhiResolvedCmsRequest } from "../types/cms-plugins";
import { resolvePhiCmsAreaMask } from "../constants/cms-areas";
import type { PhiResolvedCmsAreaPresetTree } from "../types/cms";
import { resolveCmsRootRoute } from "./cms-route";
import { buildPhiLocalCmsAreaPayload } from "./cms-area";
import { getPhiExactSiteArea } from "./cms";
import {
  resolvePhiCmsReviewParams,
  resolvePhiCmsRevisionFromSearchParams,
  resolvePhiCmsThemeReviewRequestContext,
} from "./cms-review";
import {
  setPhiRequestNavigationContext,
  setPhiRequestRuntime,
} from "./request-runtime";
import { buildPhiBlockRuntime, loadPhiSiteRequestContext } from "./runtime";
import {
  composePhiCmsActiveAreaOverlayPresets,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiAuthUiRuntimeProjection } from "../plugins/runtime-modules/auth/ui-provider";
import { resolveActivePresetModuleKeys } from "./cms-request";
import {
  applyPhiBackgroundAssetProjection,
  resolvePhiBackgroundAssetProjection,
} from "../components/widgets/helpers/background-reference-resolver.server";

export type LoadPhiCmsRootRequestArgs = {
  root: string;
  path?: string[];
  cmsBridge: PhiCmsSiteBridge;
};

type PhiCmsRequestSearchParams = Record<string, string | undefined>;

type PhiCmsServerRequest = {
  pathname?: string;
  searchParams?: PhiCmsRequestSearchParams;
};

function parseSearchParamsHeader(rawValue: string | null | undefined) {
  if (!rawValue?.trim()) {
    return undefined;
  }

  const source = rawValue.startsWith("?") ? rawValue.slice(1) : rawValue;
  const params = new URLSearchParams(source);
  const normalized: PhiCmsRequestSearchParams = {};
  for (const [key, value] of params.entries()) {
    normalized[key] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function attachRuntimeRequest(
  resolvedRequest: PhiResolvedCmsRequest | null,
  request: PhiResolvedCmsRequest["runtime"]["request"],
) {
  if (!resolvedRequest || !request) {
    return resolvedRequest;
  }

  return {
    ...resolvedRequest,
    runtime: {
      ...resolvedRequest.runtime,
      request,
    },
  };
}

export function hasPhiCmsRevisionPreview(
  searchParams?: PhiCmsRequestSearchParams,
) {
  return resolvePhiCmsRevisionFromSearchParams(searchParams) != null || resolvePhiCmsReviewParams(searchParams) != null;
}

async function loadPhiCmsServerRequest(): Promise<{
  request: PhiCmsServerRequest;
  cookieHeader: string;
}> {
  const requestHeaders = await headers();
  const cookieStore = await cookies();

  return {
    request: {
      pathname: normalizeRequestPathname(requestHeaders.get("x-phi-request-path")),
      searchParams: parseSearchParamsHeader(requestHeaders.get("x-phi-request-search")),
    },
    cookieHeader: cookieStore.toString(),
  };
}

const loadPhiCmsRootScopeCached = cache(async function loadPhiCmsRootScopeCached(
  root: string,
  pathKey: string,
  cmsBridge: PhiCmsSiteBridge,
) {
  const bridgeRuntime = cmsBridge.runtime;

  const siteKey = bridgeRuntime?.siteKey?.trim() ?? "";
  if (!siteKey) {
    throw new Error("PhiCmsSiteBridge.runtime.siteKey is required for CMS root rendering.");
  }

  const { request, cookieHeader } = await loadPhiCmsServerRequest();
  const path = pathKey.length > 0 ? pathKey.split("\u0000") : undefined;
  const effectivePath =
    path && path.length > 0 ? path : derivePathSegmentsFromRequestPath(root, request.pathname);
  const resolvedRoute = await resolveCmsRootRoute(root, effectivePath, bridgeRuntime);
  const baseRequestContext = await loadPhiSiteRequestContext(
    siteKey,
    resolvedRoute.locale,
    cookieHeader,
    bridgeRuntime?.apiBaseUrl,
    bridgeRuntime?.internalToken,
  );
  const requestContext = await resolvePhiCmsThemeReviewRequestContext({
    requestContext: baseRequestContext,
    searchParams: request.searchParams,
    cookieHeader,
  });
  const resolvedAreaMask = resolvePhiCmsAreaMask(resolvedRoute.area);
  const review = resolvePhiCmsReviewParams(request.searchParams);
  const runtime = buildPhiBlockRuntime({
    requestContext,
    areaMask: resolvedAreaMask,
    request,
  });
  setPhiRequestRuntime(runtime);
  const descriptorCatalog = resolvePhiCmsDescriptorCatalog(cmsBridge.runtimeModuleCatalog);
  const areaShellBinding = resolvePhiCmsAreaShellPresetBinding(descriptorCatalog, resolvedRoute.area);
  if (!areaShellBinding) {
    throw new Error(`Area "${resolvedRoute.area}" has no shell preset binding.`);
  }
  const [exactAreaPreset, localAreaPreset] = await Promise.all([
    getPhiExactSiteArea({
      path: resolvedRoute.cmsPath,
      apiBaseUrl: bridgeRuntime?.apiBaseUrl,
      internalToken: bridgeRuntime?.internalToken,
      siteKey,
      locale: resolvedRoute.locale,
      revision: resolvePhiCmsRevisionFromSearchParams(request.searchParams),
      review,
      cookieHeader,
      sourcePreset: {
        ownerModuleId: areaShellBinding.descriptor.ownerModuleId,
        presetKey: areaShellBinding.descriptor.presetKey,
      },
    }),
    buildPhiLocalCmsAreaPayload({
      areaMask: resolvedAreaMask,
      siteId: requestContext.site.id,
      path: resolvedRoute.cmsPath,
      runtime,
      runtimeModuleCatalog: cmsBridge.runtimeModuleCatalog,
    }),
  ]);
  const baseResolvedAreaPreset: PhiResolvedCmsAreaPresetTree | null =
    exactAreaPreset?.preset ?? localAreaPreset?.preset ?? null;
  const activeModuleIds = resolveActivePresetModuleKeys(
    cmsBridge.runtimeModuleCatalog,
    resolvedRoute.area,
    baseResolvedAreaPreset ? { preset: baseResolvedAreaPreset } : null,
    requestContext.serverCapabilities,
    runtime.viewer,
  );
  const composedAreaPreset = baseResolvedAreaPreset
    ? await composePhiCmsActiveAreaOverlayPresets({
        tree: baseResolvedAreaPreset,
        catalog: descriptorCatalog,
        activeModuleIds,
        siteId: requestContext.site.id,
        area: resolvedRoute.area,
        path: resolvedRoute.cmsPath,
        runtime,
      })
    : null;
  // The shell Header, Hero, and Footer Backgrounds live in this tree, and it is composed after the
  // page request resolved its own. Projecting here is what makes an Asset-bound shell Background
  // draw the same crop as an Image Widget -- and pick up an invalidated variant after a focal change.
  const resolvedAreaPreset = composedAreaPreset
    ? applyPhiBackgroundAssetProjection(
        composedAreaPreset,
        await resolvePhiBackgroundAssetProjection({
          runtime,
          trees: [composedAreaPreset],
        }),
      )
    : null;
  const runtimeWithAuthProvider = {
    ...runtime,
    authUiProvider: resolvePhiAuthUiRuntimeProjection(
      cmsBridge.runtimeModuleCatalog,
      activeModuleIds,
      resolvedRoute.area,
    ),
  };
  setPhiRequestRuntime(runtimeWithAuthProvider);
  setPhiRequestNavigationContext(
    resolvedRoute.area,
    resolvePhiCmsDescriptorCatalog(cmsBridge.runtimeModuleCatalog),
    activeModuleIds,
  );

  return {
    resolvedRoute,
    resolvedAreaPreset,
    request,
    runtime: runtimeWithAuthProvider,
    cookieHeader,
    requestContext,
  };
});

/**
 * Keys the per-request cache on the EFFECTIVE path rather than the passed one.
 *
 * A Layout receives no catch-all segments and a Page does, so keying on the argument gave the two a
 * different cache entry for the same request and resolved it twice. Sharing the entry is what lets the
 * Layout decide -- 404, refusal, redirect -- before the shell flushes and the status line commits.
 */
async function resolvePhiCmsRootPathKey(root: string, path: readonly string[] | undefined) {
  if (path?.length) {
    return path.join("\u0000");
  }

  const { request } = await loadPhiCmsServerRequest();
  const derived = derivePathSegmentsFromRequestPath(root, request.pathname);
  return derived?.length ? derived.join("\u0000") : "";
}

export async function loadPhiCmsRootScope({
  root,
  path,
  cmsBridge,
}: LoadPhiCmsRootRequestArgs) {
  return loadPhiCmsRootScopeCached(root, await resolvePhiCmsRootPathKey(root, path), cmsBridge);
}

const loadPhiCmsRootRequestCached = cache(async function loadPhiCmsRootRequestCached(
  root: string,
  pathKey: string,
  cmsBridge: PhiCmsSiteBridge,
) {
  const path = pathKey.length > 0 ? pathKey.split("\u0000") : undefined;
  const rootScope = await loadPhiCmsRootScope({
    root,
    path,
    cmsBridge,
  });
  const bridgeRuntime = cmsBridge.runtime;
  const loadResolvedRequest = cmsBridge.loadResolvedRequest;

  if (!loadResolvedRequest) {
    throw new Error("PhiCmsSiteBridge.loadResolvedRequest is required for CMS root rendering.");
  }

  const siteKey = bridgeRuntime?.siteKey?.trim() ?? "";
  if (!siteKey) {
    throw new Error("PhiCmsSiteBridge.runtime.siteKey is required for CMS root rendering.");
  }

  const resolvedRequest = await loadResolvedRequest({
    siteKey,
    locale: rootScope.resolvedRoute.locale,
    path: rootScope.resolvedRoute.cmsPath,
    cookieHeader: rootScope.cookieHeader,
    searchParams: rootScope.request.searchParams,
    requestContext: rootScope.requestContext,
    runtimeModuleCatalog: cmsBridge.runtimeModuleCatalog,
  });
  const effectiveResolvedRequest = attachRuntimeRequest(
    resolvedRequest,
    rootScope.request,
  );

  if (effectiveResolvedRequest) {
    setPhiRequestRuntime(effectiveResolvedRequest.runtime);
  }

  return {
    resolvedRoute: rootScope.resolvedRoute,
    request: rootScope.request,
    runtime: rootScope.runtime,
    requestContext: rootScope.requestContext,
    resolvedAreaPreset: rootScope.resolvedAreaPreset,
    resolvedRequest: effectiveResolvedRequest,
  };
});

export async function loadPhiCmsRootRequest({
  root,
  path,
  cmsBridge,
}: LoadPhiCmsRootRequestArgs) {
  return loadPhiCmsRootRequestCached(root, await resolvePhiCmsRootPathKey(root, path), cmsBridge);
}
function normalizeRequestPathname(rawValue: string | null | undefined) {
  if (!rawValue?.trim()) {
    return undefined;
  }

  const pathname = rawValue.trim();
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function derivePathSegmentsFromRequestPath(
  root: string,
  pathname: string | undefined,
) {
  if (!pathname) {
    return undefined;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  if (segments[0]?.toLowerCase() !== root.trim().toLowerCase()) {
    return undefined;
  }

  const nested = segments.slice(1);
  return nested.length > 0 ? nested : undefined;
}
