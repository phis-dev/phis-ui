import "server-only";

import type { NextRequest } from "next/server";

import { resolvePhiCmsAreaMask, type PhiCmsAreaKey } from "../constants/cms-areas";
import { isKnownSpecialCmsRoot } from "../helpers/cms-routing";
import { getResolvedFormDefinition } from "./form-registry";
import { getExactSiteArea } from "./site-area";
import { getPhiServerCapabilitySnapshot } from "./server-capabilities";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { resolvePhiCmsDescriptorCatalog } from "../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiRuntimeModuleSet } from "../plugins/runtime-modules/resolver";
import { readPhiRuntimeModuleIds, resolvePhiRuntimeModuleIdsForArea } from "../plugins/runtime-modules/settings";
import type { PhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { buildPhiLocalCmsAreaPayload } from "../server-helpers/cms-area";
import { buildPhiBlockRuntime, loadPhiSiteRequestContext } from "../server-helpers/runtime";
import { runWithPhiRequestRuntime } from "../server-helpers/request-runtime";
import type { PhiFormHandlerPhase, PhiFormHandlerProviderDescriptor } from "../types/form-descriptor";

export type PhiResolvedServerFormHandler = {
  formId: string;
  area: PhiCmsAreaKey;
  provider: PhiFormHandlerProviderDescriptor;
};

function resolveRequestArea(request: NextRequest): { area: PhiCmsAreaKey; locale: string } | null {
  const referer = request.headers.get("referer")?.trim();
  if (!referer) return null;
  let pathname = "";
  try {
    const url = new URL(referer);
    const requestHosts = [
      request.nextUrl.host,
      request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim(),
      request.headers.get("host")?.trim(),
    ].filter((host): host is string => Boolean(host));
    if (!requestHosts.some((host) => host.toLowerCase() === url.host.toLowerCase())) return null;
    pathname = url.pathname;
  } catch {
    return null;
  }
  const firstSegment = pathname.split("/").filter(Boolean)[0]?.trim().toLowerCase() ?? "";
  const cookieLocale = request.cookies.get("phis_locale")?.value?.trim().toLowerCase() || "en";
  if (isKnownSpecialCmsRoot(firstSegment)) {
    return { area: firstSegment as PhiCmsAreaKey, locale: cookieLocale };
  }
  if (firstSegment === "public") {
    return { area: "public", locale: cookieLocale };
  }
  return { area: "public", locale: firstSegment || cookieLocale };
}

function resolveAreaPath(area: PhiCmsAreaKey) {
  return area === "public" ? "/" : `/${area}`;
}

export async function resolvePhiServerFormHandler(options: {
  request: NextRequest;
  upstreamBaseUrl: string;
  internalToken: string;
  siteKey: string;
  formId: string;
  phase: PhiFormHandlerPhase;
  runtimeModuleCatalog?: PhiRuntimeModuleCatalog;
}): Promise<PhiResolvedServerFormHandler | null> {
  const requestContext = resolveRequestArea(options.request);
  if (!requestContext) return null;
  const catalog = options.runtimeModuleCatalog ?? PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG;
  const descriptorCatalog = resolvePhiCmsDescriptorCatalog(catalog);
  const areaDefinition = descriptorCatalog.areaDefinitions.get(requestContext.area);
  if (!areaDefinition) return null;

  const areaPayload = await getExactSiteArea({
    apiBaseUrl: options.upstreamBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    area: requestContext.area,
    path: resolveAreaPath(requestContext.area),
    locale: requestContext.locale,
    cookieHeader: options.request.headers.get("cookie"),
    sourcePreset: {
      ownerModuleId: areaDefinition.baseModuleId,
      presetKey: areaDefinition.shellPresetKey,
    },
  });
  let tree = areaPayload?.preset ?? null;
  let fallbackRequestContext: Awaited<ReturnType<typeof loadPhiSiteRequestContext>> | null = null;
  if (!tree) {
    fallbackRequestContext = await loadPhiSiteRequestContext(
      options.siteKey,
      requestContext.locale,
      options.request.headers.get("cookie") ?? "",
      options.upstreamBaseUrl,
      options.internalToken,
    );
    const areaMask = resolvePhiCmsAreaMask(requestContext.area);
    const runtime = buildPhiBlockRuntime({
      requestContext: fallbackRequestContext,
      areaMask,
    });
    // The code-owned preset trees resolve their labels through the request runtime store. The page
    // render path populates it in the root layout; this route handler runs outside the React render,
    // so the store must be scoped explicitly around the instantiation — otherwise the first label
    // lookup after a cold start fails the whole dispatch once the label cache no longer masks it.
    tree = (await runWithPhiRequestRuntime(runtime, () => buildPhiLocalCmsAreaPayload({
      areaMask,
      siteId: fallbackRequestContext!.site.id,
      path: resolveAreaPath(requestContext.area),
      runtime,
      runtimeModuleCatalog: catalog,
    })))?.preset ?? null;
  }
  if (!tree) return null;
  const optionalModuleIds = resolvePhiRuntimeModuleIdsForArea(
    requestContext.area,
    readPhiRuntimeModuleIds(tree.runtimeModuleIds ?? tree.preset.config.runtimeModules),
    [...catalog.values()].map((entry) => entry.definition),
  );
  const serverCapabilities = fallbackRequestContext?.serverCapabilities ??
    await getPhiServerCapabilitySnapshot({
      apiBaseUrl: options.upstreamBaseUrl,
      internalToken: options.internalToken,
      siteKey: options.siteKey,
    });
  const moduleSet = await resolvePhiRuntimeModuleSet({
    catalog,
    moduleIds: optionalModuleIds,
    area: requestContext.area,
    serverCapabilities,
  });
  const resolvedForm = await getResolvedFormDefinition({
    apiBaseUrl: options.upstreamBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    formId: options.formId,
    presetDefinitions: [...moduleSet.formDefinitionsById.values()],
  });
  if (!resolvedForm || !moduleSet.activeModuleIds.has(resolvedForm.definition.ownerModuleId)) return null;
  const handlerKey = options.phase === "submit"
    ? resolvedForm.definition.submitHandlerKey
    : options.phase === "confirm"
      ? resolvedForm.definition.confirmHandlerKey
      : resolvedForm.definition.previewHandlerKey;
  if (!handlerKey) return null;
  const provider = [...moduleSet.formHandlerProviderDescriptorsByKey.values()].find(
    (candidate) => candidate.phase === options.phase && candidate.handlerKey === handlerKey,
  ) ?? null;
  if (!provider || !moduleSet.activeModuleIds.has(provider.ownerModuleId)) return null;
  return { formId: resolvedForm.definition.formId, area: requestContext.area, provider };
}
