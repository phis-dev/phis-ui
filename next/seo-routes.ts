import "server-only";

import { resolvePhiCmsAreaMask } from "../constants/cms-areas";
import { resolvePhiCmsPageRedirect } from "../components/cms/phi-cms-page-redirect";
import { fetchPhiPublishedPublicPages } from "../gateway/public-pages";
import {
  PHI_AREA_META_PUBLIC_DEFAULTS,
  readPhiAreaLandingSelection,
  readPhiAreaMeta,
  readPhiAreaPublicRoutePaths,
} from "../helpers/cms-area-config";
import {
  collectPhiSitemapCandidates,
  renderPhiRobotsTxt,
  renderPhiSitemapXml,
  resolvePhiSitePublicBase,
  type PhiSitemapCandidate,
} from "../helpers/phi-seo";
import { readPhiSiteRuntimeConfigSync } from "../helpers/site-runtime";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../plugins/runtime-modules/descriptor-compiler";
import { getPhiCmsPage, getPhiExactSiteArea } from "../server-helpers/cms";
import { resolveActivePresetModuleKeys, resolvePhiCmsRequest } from "../server-helpers/cms-request";
import { runWithPhiRequestRuntime } from "../server-helpers/request-runtime";
import { buildPhiBlockRuntime, loadPhiSiteRequestContext, type PhiSiteRequestContext } from "../server-helpers/runtime";
import { fetchSiteLocaleConfig } from "../server-helpers/site-locale";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";

const PHI_SITEMAP_PATH = "/sitemap.xml";
/** How many candidates are resolved at once. Each one is a page lookup against the server. */
const PHI_SITEMAP_RESOLVE_CONCURRENCY = 6;

type PhiPublicSeoContext = {
  bridgeRuntime: NonNullable<PhiCmsSiteBridge["runtime"]>;
  requestContext: PhiSiteRequestContext;
  locale: string;
  publicBase: string | null;
  areaPreset: Awaited<ReturnType<typeof getPhiExactSiteArea>>;
  /** Whether this Site has a sitemap at all: a public base, and a Public Area that is indexed and listed. */
  sitemapEnabled: boolean;
};

/**
 * What the Public Area says about search engines, read as an anonymous visitor.
 *
 * Anonymous because that is who a crawler is: a sitemap that listed what a signed-in Editor can see
 * would hand out addresses that answer a crawler with a login.
 */
async function loadPhiPublicSeoContext(bridge: PhiCmsSiteBridge): Promise<PhiPublicSeoContext | null> {
  const bridgeRuntime = bridge.runtime;
  if (!bridgeRuntime) {
    return null;
  }
  const { siteKey, apiBaseUrl, internalToken } = bridgeRuntime;
  const localeConfig = await fetchSiteLocaleConfig({ apiBaseUrl, internalToken, siteKey });
  const locale = localeConfig.defaultLocale;
  const requestContext = await loadPhiSiteRequestContext(siteKey, locale, "", apiBaseUrl, internalToken);
  const catalog = resolvePhiCmsDescriptorCatalog(bridge.runtimeModuleCatalog);
  const shellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, "public");
  const areaPreset = shellBinding
    ? await getPhiExactSiteArea({
        path: "/",
        siteKey,
        apiBaseUrl,
        internalToken,
        locale,
        cookieHeader: "",
        sourcePreset: {
          ownerModuleId: shellBinding.descriptor.ownerModuleId,
          presetKey: shellBinding.descriptor.presetKey,
        },
      })
    : null;
  const meta = readPhiAreaMeta(areaPreset?.preset.preset.config);
  const publicBase = resolvePhiSitePublicBase(
    requestContext.site.publicUrl,
    readPhiSiteRuntimeConfigSync().site.publicUrl,
  );

  return {
    bridgeRuntime,
    requestContext,
    locale,
    publicBase,
    areaPreset,
    sitemapEnabled: Boolean(publicBase)
      && (meta?.index ?? PHI_AREA_META_PUBLIC_DEFAULTS.index)
      && (meta?.sitemap ?? PHI_AREA_META_PUBLIC_DEFAULTS.sitemap),
  };
}

/**
 * Whether one candidate belongs in the sitemap, answered by resolving it like a page view.
 *
 * The same resolution a visitor's request runs -- route table, the Builder's root route, the Page's
 * access policy, its flags -- as a lookup that binds no request state. So a Page is listed exactly when
 * a crawler fetching it would get a document it may index: not a redirect, not a login, not `noindex`.
 * Deciding this from the stored rows instead would be a second copy of those rules, free to drift.
 */
async function isPhiSitemapCandidateListed(
  bridge: PhiCmsSiteBridge,
  context: PhiPublicSeoContext,
  path: string,
): Promise<boolean> {
  const { siteKey, apiBaseUrl, internalToken } = context.bridgeRuntime;
  const { locale, requestContext } = context;
  const scopeRuntime = buildPhiBlockRuntime({
    requestContext,
    areaMask: resolvePhiCmsAreaMask("public"),
  });
  const resolved = await runWithPhiRequestRuntime(scopeRuntime, () => resolvePhiCmsRequest({
    siteKey,
    locale,
    area: "public",
    path,
    cookieHeader: "",
    apiBaseUrl,
    internalToken,
    requestContext,
    runtimeModuleCatalog: bridge.runtimeModuleCatalog,
    purpose: "lookup",
    loadExactCmsArea: (requestPath, sourcePreset) =>
      getPhiExactSiteArea({
        path: requestPath,
        siteKey,
        apiBaseUrl,
        internalToken,
        locale,
        cookieHeader: "",
        sourcePreset,
      }),
    loadResolvedCmsPage: (requestPath, sourcePreset) =>
      getPhiCmsPage({
        path: requestPath,
        siteKey,
        apiBaseUrl,
        internalToken,
        locale,
        cookieHeader: "",
        sourcePreset,
      }),
  }));

  return resolved != null
    && resolvePhiCmsPageRedirect(resolved.page.page, locale) == null
    && resolved.runtime.page?.noindex !== true;
}

async function filterPhiSitemapCandidates(
  bridge: PhiCmsSiteBridge,
  context: PhiPublicSeoContext,
  candidates: readonly PhiSitemapCandidate[],
) {
  const listed = new Array<boolean>(candidates.length).fill(false);
  let next = 0;
  async function work() {
    while (next < candidates.length) {
      const index = next++;
      listed[index] = await isPhiSitemapCandidateListed(bridge, context, candidates[index].path);
    }
  }
  await Promise.all(Array.from({ length: PHI_SITEMAP_RESOLVE_CONCURRENCY }, work));
  return candidates.filter((_candidate, index) => listed[index]);
}

async function buildPhiSitemapXml(bridge: PhiCmsSiteBridge): Promise<string | null> {
  const context = await loadPhiPublicSeoContext(bridge);
  if (!context?.sitemapEnabled || !context.publicBase) {
    return null;
  }
  const { siteKey, apiBaseUrl, internalToken } = context.bridgeRuntime;
  const { requestContext, areaPreset } = context;
  const catalog = resolvePhiCmsDescriptorCatalog(bridge.runtimeModuleCatalog);
  const activeModuleIds = resolveActivePresetModuleKeys(
    bridge.runtimeModuleCatalog,
    "public",
    areaPreset ? { preset: areaPreset.preset } : null,
    requestContext.serverCapabilities,
    requestContext.viewer,
  );
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog,
    area: "public",
    activeModuleIds,
    viewer: requestContext.viewer,
    publicRoutePaths: readPhiAreaPublicRoutePaths(areaPreset?.preset.preset.config),
    landingSelection: readPhiAreaLandingSelection(areaPreset?.preset.preset.config),
  });
  const publishedPages = await fetchPhiPublishedPublicPages({ apiBaseUrl, internalToken, siteKey });
  const candidates = collectPhiSitemapCandidates({
    moduleRoutes: [...routeTable.exactByPath].map(([path, descriptor]) => [path, descriptor] as const),
    publishedPages,
  });
  const listed = await filterPhiSitemapCandidates(bridge, context, candidates);

  return renderPhiSitemapXml(listed, {
    publicBase: context.publicBase,
    availableLocales: requestContext.site.availableLocales.map((option) => option.code),
    defaultLocale: requestContext.site.defaultLocale,
  });
}

/**
 * `GET /sitemap.xml`, over the Public Pages a crawler may index, in every locale.
 *
 * A route handler rather than Next's `sitemap.ts`, because a Site that has no sitemap -- no public
 * base, or a Public Area that is not indexed or not listed -- has to answer 404, not an empty list.
 */
export function buildPhiSitemapRouteHandler({ bridge }: { bridge: PhiCmsSiteBridge }) {
  return async function GET() {
    const xml = await buildPhiSitemapXml(bridge);
    if (xml == null) {
      return new Response("Not Found", { status: 404, headers: { "cache-control": "no-store" } });
    }
    return new Response(xml, {
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" },
    });
  };
}

/**
 * `GET /robots.txt`, which allows everything and names the sitemap when there is one.
 *
 * It answers even when the Site cannot be read, without the sitemap line. A crawler that gets a server
 * error for robots.txt stops crawling the whole host until it gets an answer, so a failure here would
 * take every Page out of reach for as long as it lasts; a missing sitemap line costs nothing.
 */
export function buildPhiRobotsRouteHandler({ bridge }: { bridge: PhiCmsSiteBridge }) {
  return async function GET() {
    let sitemapUrl: string | null = null;
    try {
      const context = await loadPhiPublicSeoContext(bridge);
      sitemapUrl = context?.sitemapEnabled && context.publicBase
        ? `${context.publicBase}${PHI_SITEMAP_PATH}`
        : null;
    } catch (error) {
      console.warn("[phi-robots] Site could not be read; answering without a sitemap.", { error });
    }
    return new Response(renderPhiRobotsTxt(sitemapUrl), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  };
}
