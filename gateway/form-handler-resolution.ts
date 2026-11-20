import "server-only";

import type { NextRequest } from "next/server";

import { isPhiCmsAreaKey, type PhiCmsAreaKey } from "../constants/cms-areas";
import { canPhiViewerAccess, type PhiAccessViewer } from "../types/access";
import { getResolvedFormDefinition } from "./form-registry";
import { getExactSiteArea } from "./site-area";
import { getPhiCapabilitySnapshot } from "./server-capabilities";
import { resolvePhiCmsDescriptorCatalog } from "../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiRuntimeModuleSet } from "../plugins/runtime-modules/resolver";
import { resolvePhiRuntimeModuleIdsForArea } from "../plugins/runtime-modules/settings";
import type { PhiRuntimeModuleCatalog } from "../plugins/runtime-modules/contracts";
import { loadPhiSiteRequestContext } from "../server-helpers/runtime";
import type { PhiFormHandlerPhase, PhiFormHandlerProviderDescriptor } from "../types/form-descriptor";
import { readPhiAreaSelectionRuntimeModuleIds } from "../helpers/cms-area-config";
import { fetchResolvedSiteLocale } from "../server-helpers/site-locale";

export type PhiResolvedServerFormHandler = {
  formId: string;
  area: PhiCmsAreaKey;
  provider: PhiFormHandlerProviderDescriptor;
};

/**
 * Who the relay knows it is talking to before asking anybody: nobody in particular. An Area this viewer
 * admits is entered without reading the session; any other Area asks for it first.
 */
const PHI_ANONYMOUS_FORM_VIEWER: PhiAccessViewer = { access: "public" };

/**
 * The locale the Form's Area is read in: what the Site resolves for this request -- the viewer's choice,
 * then the browser, then the Site default -- and never a string off the path. Core answers only with one
 * of the Site's own locales.
 *
 * It used to be the first segment of the referer for Public, taken as it stood. Any path that was not a
 * special Area became a locale, `favicon.ico` included, and was handed on to the Area read as one.
 */
async function resolveRequestLocale(
  request: NextRequest,
  site: { upstreamBaseUrl: string; internalToken: string; siteKey: string },
) {
  return (await fetchResolvedSiteLocale({
    apiBaseUrl: site.upstreamBaseUrl,
    internalToken: site.internalToken,
    siteKey: site.siteKey,
    acceptLanguage: request.headers.get("accept-language"),
    cookieHeader: request.headers.get("cookie"),
  })).locale;
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
  /**
   * The Area the Form was drawn in, as the page that drew it names it.
   *
   * It used to be read off the `Referer`, which a browser may leave out (a `no-referrer` policy, a
   * privacy extension) -- every submit then answered "not active" -- and which a page's own script may
   * set to any address on the host. So it was the client's choice either way, only an unreliable one.
   * Named outright, it is checked for what it grants: an Area this Site hosts, which this viewer may
   * enter, whose active Modules own the Form and its handler. A viewer can reach nothing here that
   * opening a page of that Area would not have shown them.
   */
  area: string | null | undefined;
  /**
   * The catalog of the Area the request came from, loaded once that Area is known.
   *
   * A loader rather than a catalog, and required rather than defaulted. It used to fall back to the
   * Builder's all-Areas catalog, which had two costs. It answered a question nobody asked -- a Module
   * inactive in the requesting Area still resolved a handler, so activation was a display decision for
   * Forms and a boundary everywhere else. And being a static import, it pulled every Area's Widget
   * plugins into any graph that reached this file.
   *
   * A Form drawn on the Builder canvas needs no exception. The canvas is authoring: its runtime is a
   * stand-in and a Form there must not submit, so the canvas names no Area and nothing resolves -- the
   * correct refusal rather than a case to work around.
   */
  loadRuntimeModuleCatalog: (area: PhiCmsAreaKey) => Promise<PhiRuntimeModuleCatalog | null>;
}): Promise<PhiResolvedServerFormHandler | null> {
  const area = options.area?.trim().toLowerCase() ?? "";
  if (!isPhiCmsAreaKey(area)) return null;
  const catalog = await options.loadRuntimeModuleCatalog(area);
  if (!catalog) return null;
  const descriptorCatalog = resolvePhiCmsDescriptorCatalog(catalog);
  const areaDefinition = descriptorCatalog.areaDefinitions.get(area);
  if (!areaDefinition) return null;

  const locale = await resolveRequestLocale(options.request, options);
  const cookieHeader = options.request.headers.get("cookie") ?? "";
  // Read at most once, and only when something needs the viewer or the server: an admitting Area, the capabilities.
  const siteRequest: { context: Awaited<ReturnType<typeof loadPhiSiteRequestContext>> | null } = {
    context: null,
  };
  const loadSiteRequestContext = async () => siteRequest.context ??= await loadPhiSiteRequestContext(
    options.siteKey,
    locale,
    cookieHeader,
    options.upstreamBaseUrl,
    options.internalToken,
  );
  // What the Area's Layout asks before it renders (components/cms/phi-cms-area-access-guard.ts).
  if (
    !canPhiViewerAccess(PHI_ANONYMOUS_FORM_VIEWER, areaDefinition.accessPolicy) &&
    !canPhiViewerAccess((await loadSiteRequestContext()).viewer, areaDefinition.accessPolicy)
  ) {
    return null;
  }

  /*
   * The Area's Module selection, stored apart from its structure: which Modules may answer is all this
   * needs, and an Area that never stored one runs its default list -- no shell is built to find out.
   */
  const storedArea = await getExactSiteArea({
    apiBaseUrl: options.upstreamBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    area,
    path: resolveAreaPath(area),
    locale,
    cookieHeader,
  });
  const optionalModuleIds = resolvePhiRuntimeModuleIdsForArea(
    area,
    readPhiAreaSelectionRuntimeModuleIds(storedArea?.modules, area),
    [...catalog.values()].map((entry) => entry.definition),
  );
  const serverCapabilities = siteRequest.context?.serverCapabilities ??
    await getPhiCapabilitySnapshot({
      apiBaseUrl: options.upstreamBaseUrl,
      internalToken: options.internalToken,
      siteKey: options.siteKey,
    });
  const moduleSet = await resolvePhiRuntimeModuleSet({
    catalog,
    moduleIds: optionalModuleIds,
    area,
    serverCapabilities,
  });
  const resolvedForm = await getResolvedFormDefinition({
    apiBaseUrl: options.upstreamBaseUrl,
    internalToken: options.internalToken,
    siteKey: options.siteKey,
    formId: options.formId,
    presetDefinitions: [...moduleSet.formDefinitionsById.values()],
  });
  if (!resolvedForm || !moduleSet.activeModuleIds.has(resolvedForm.definition.ownerModuleId)) {
    return null;
  }
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
  return { formId: resolvedForm.definition.formId, area, provider };
}
