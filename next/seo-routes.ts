import "server-only";

import { createHash } from "node:crypto";

import { resolvePhiCmsAreaMask } from "../constants/cms-areas";
import { resolvePhiCmsPageRedirect } from "../components/cms/phi-cms-page-redirect";
import { getPublicSiteAreaWithPublishedPages, type PhiPublishedPublicPage } from "../gateway/site-area";
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
import { createPhiFingerprintCache } from "../helpers/phi-sitemap-cache";
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
import type { PhiRuntimeModuleId } from "../types/cms-module-descriptors";

const PHI_SITEMAP_PATH = "/sitemap.xml";
/** How many candidates are resolved at once. Each one is a page lookup against the server. */
const PHI_SITEMAP_RESOLVE_CONCURRENCY = 6;

type PhiPublicSeoContext = {
  bridgeRuntime: NonNullable<PhiCmsSiteBridge["runtime"]>;
  requestContext: PhiSiteRequestContext;
  locale: string;
  publicBase: string | null;
  areaPreset: Awaited<ReturnType<typeof getPhiExactSiteArea>>;
  /** Asked only by the sitemap; robots.txt needs the switches and nothing else. */
  publishedPages: PhiPublishedPublicPage[];
  /** Whether this Site has a sitemap at all: a public base, and a Public Area that is indexed and listed. */
  sitemapEnabled: boolean;
};

/**
 * What the Public Area says about search engines, read as an anonymous visitor.
 *
 * Anonymous because that is who a crawler is: a sitemap that listed what a signed-in Editor can see
 * would hand out addresses that answer a crawler with a login.
 */
async function loadPhiPublicSeoContext(
  bridge: PhiCmsSiteBridge,
  { withPublishedPages }: { withPublishedPages: boolean },
): Promise<PhiPublicSeoContext | null> {
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
  if (!shellBinding) {
    return null;
  }
  const sourcePreset = {
    ownerModuleId: shellBinding.descriptor.ownerModuleId,
    presetKey: shellBinding.descriptor.presetKey,
  };
  const { area: areaPreset, publishedPages } = withPublishedPages
    ? await getPublicSiteAreaWithPublishedPages({ apiBaseUrl, internalToken, siteKey, locale, sourcePreset })
    : {
        area: await getPhiExactSiteArea({
          path: "/",
          siteKey,
          apiBaseUrl,
          internalToken,
          locale,
          cookieHeader: "",
          sourcePreset,
        }),
        publishedPages: [],
      };
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
    publishedPages,
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

async function buildPhiSitemapXml(
  bridge: PhiCmsSiteBridge,
  context: PhiPublicSeoContext & { publicBase: string },
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
): Promise<string> {
  const { requestContext, areaPreset, publishedPages } = context;
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog: resolvePhiCmsDescriptorCatalog(bridge.runtimeModuleCatalog),
    area: "public",
    activeModuleIds,
    viewer: requestContext.viewer,
    publicRoutePaths: readPhiAreaPublicRoutePaths(areaPreset?.preset.preset.config),
    landingSelection: readPhiAreaLandingSelection(areaPreset?.preset.preset.config),
  });
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
 * Everything a publish can change about the sitemap, reduced to one value.
 *
 * The published Pages carry their live revision ids, so a publish, an unpublish, a tombstone and a
 * path change all move it; the Area preset carries the switches, the root route and the Module
 * addresses; the active Modules follow Add-on availability; locales and public base are Site settings.
 * What it leaves out -- the installed Module catalog -- changes only with a new Site process, and a
 * new process starts with an empty cache.
 */
function buildPhiSitemapFingerprint(
  context: PhiPublicSeoContext,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
) {
  return createHash("sha256").update(JSON.stringify({
    publishedPages: context.publishedPages,
    area: context.areaPreset?.preset ?? null,
    activeModuleIds: [...activeModuleIds].sort(),
    publicBase: context.publicBase,
    availableLocales: context.requestContext.site.availableLocales.map((option) => option.code),
    defaultLocale: context.requestContext.site.defaultLocale,
  })).digest("hex");
}

/**
 * `GET /sitemap.xml`, over the Public Pages a crawler may index, in every locale.
 *
 * A route handler rather than Next's `sitemap.ts`, because a Site that has no sitemap -- no public
 * base, or a Public Area that is not indexed or not listed -- has to answer 404, not an empty list.
 *
 * The finished document is kept until the next publish. Each request still reads the Public Area with
 * its published Pages -- one request, needed for the switches anyway -- and rebuilds only when the
 * fingerprint of that answer changed; resolving every candidate is the part that is skipped.
 */
export function buildPhiSitemapRouteHandler({ bridge }: { bridge: PhiCmsSiteBridge }) {
  const cache = createPhiFingerprintCache<string>();

  return async function GET() {
    const context = await loadPhiPublicSeoContext(bridge, { withPublishedPages: true });
    const publicBase = context?.publicBase;
    if (!context?.sitemapEnabled || !publicBase) {
      return new Response("Not Found", { status: 404, headers: { "cache-control": "no-store" } });
    }
    const activeModuleIds = resolveActivePresetModuleKeys(
      bridge.runtimeModuleCatalog,
      "public",
      context.areaPreset ? { preset: context.areaPreset.preset } : null,
      context.requestContext.serverCapabilities,
      context.requestContext.viewer,
    );
    const xml = await cache.resolve(
      buildPhiSitemapFingerprint(context, activeModuleIds),
      () => buildPhiSitemapXml(bridge, { ...context, publicBase }, activeModuleIds),
    );
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
      const context = await loadPhiPublicSeoContext(bridge, { withPublishedPages: false });
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
