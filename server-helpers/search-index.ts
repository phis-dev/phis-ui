import "server-only";

import { translatePhiWidgetConfigTexts } from "./cms-widget-texts";
import { createHash } from "node:crypto";

import { PHI_SHARED_PACKAGE_NAME } from "../constants/package";
import { createPhiRuntimeModuleId } from "../constants/module-identity";

import { PHI_SEARCH_MAX_DOCUMENTS, type PhiSearchDocument } from "@phis/contracts/search";

import { resolvePhiCmsPageRedirect } from "../components/cms/phi-cms-page-redirect";
import type { PhiCmsAreaKey } from "../constants/cms-areas";
import { getSiteAreaWithPublishedPages } from "../gateway/site-area";
import { getResolvedSiteConfig } from "../gateway/site-config";
import { onPhiSiteReadMarker } from "../gateway/site-read-marker-listeners";
import { fetchPhiSiteSearchIndexStates, putPhiSiteSearchIndexSet } from "../gateway/site-search";
import {
  buildPhiRuntimeModuleAccessRegistry,
  filterPhiCmsRenderableTreeForViewer,
} from "../helpers/cms-access-policy";
import { collectPhiSitemapCandidates } from "../helpers/phi-seo";
import {
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../plugins/runtime-modules/descriptor-compiler";
import { resolvePhiCmsAreaRuntimeModuleScope } from "../components/cms/phi-cms-runtime-registry";
import { canPhiViewerAccess } from "../types/access";
import type { PhiCmsSiteBridge, PhiCmsRuntimeWidgetPlugin } from "../types/cms-plugins";
import type { PhiSiteRequestContext } from "../types/site-request-context";
import { resolvePhiCmsLookup } from "./cms-lookup";
import { resolvePhiAreaRouteScope } from "./cms-request";
import { runWithPhiRequestRuntime } from "./request-runtime";
import { loadPhiSiteRequestContext } from "./runtime";
import { getPhiSiteBuildId } from "./site-build-id";
import { joinPhiSearchText } from "./search-text";

/**
 * The Site's half of its search (SEARCH.md): the documents phis indexes, built from the published Pages.
 *
 * A Page's words are not in one place phis could read -- Widget configs, content bound to an instance in
 * a tree, documents fetched while the Page is drawn -- so the Site reads each Page the way a visitor's
 * request does and writes what it saw. The enumeration is the sitemap's: the Area's published Pages and
 * the active Module routes are the candidates, and resolving each one as a lookup decides whether a
 * visitor would get a document. The text is each Widget's own answer (`searchText` on its plugin),
 * translated for the language being indexed; the title and description are the Page's own.
 *
 * Two Areas, read as the reader who may search them: Public anonymously, App as a signed-in member with
 * no further roles. A Page with a narrower access policy than that is not written.
 *
 * It runs when the Site's read marker is first seen by this process and whenever it moves -- which a
 * publish does -- and writes only the sets whose fingerprint phis does not hold yet, so several
 * processes noticing one publish produce one write. One run at a time per process; a marker that moves
 * during a run queues one more.
 */

const PHI_SEARCH_INDEX_AREAS = ["public", "app"] as const;

/*
 * The first-party Search Module, named by id as data (MODULES.md, "The dependency rule"): an Area is
 * indexed only where it is switched on, since only there is anything placed that reads the index.
 */
const PHI_SEARCH_RUNTIME_MODULE_ID = createPhiRuntimeModuleId(PHI_SHARED_PACKAGE_NAME, "search");
type PhiSearchIndexArea = (typeof PHI_SEARCH_INDEX_AREAS)[number];

/** How many Pages are resolved at once; each is a page lookup against the server. */
const PHI_SEARCH_INDEX_RESOLVE_CONCURRENCY = 4;

/** How long after the marker moved the run starts, so a burst of publishes is one run. */
const PHI_SEARCH_INDEX_DEBOUNCE_MS = 2_000;

/**
 * The Widgets that could not say their words in one run, by type: how many Pages lost them, and the
 * first Page and error as the example. A Widget type that fails fails on every Page that holds it, so the
 * run names it once at its end instead of once per Page and set.
 */
type PhiSearchWidgetFailures = Map<string, { pages: number; first: string; error: unknown }>;

type PhiSearchAccessRegistry = ReturnType<typeof buildPhiRuntimeModuleAccessRegistry>;

type PhiSearchIndexRegistry = {
  bridges: Map<PhiSearchIndexArea, PhiCmsSiteBridge>;
  listening: boolean;
  running: Promise<void> | null;
  queued: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

const REGISTRY_KEY = Symbol.for("phis-ui.search-index");

function readRegistry(): PhiSearchIndexRegistry {
  const holder = globalThis as typeof globalThis & { [REGISTRY_KEY]?: PhiSearchIndexRegistry };
  holder[REGISTRY_KEY] ??= { bridges: new Map(), listening: false, running: null, queued: false, timer: null };
  return holder[REGISTRY_KEY];
}

/**
 * Names the Bridge an Area's Pages are read through. The Area host registers itself when it is created
 * (next/areas/*.ts); an Area this process never served is not indexed by it, and another process will.
 */
export function registerPhiSearchIndexArea(area: PhiSearchIndexArea, bridge: PhiCmsSiteBridge) {
  const registry = readRegistry();
  registry.bridges.set(area, bridge);
  if (!registry.listening) {
    registry.listening = true;
    onPhiSiteReadMarker(() => schedulePhiSearchIndexRun());
  }
  /*
   * And once now: the Site's marker may have been seen before this Area was registered -- the proxy reads
   * the config before the first page is served -- and a set phis already holds costs one read of its states.
   */
  schedulePhiSearchIndexRun();
}

/** Runs the indexer soon, once, however often it is asked meanwhile. */
function schedulePhiSearchIndexRun() {
  const registry = readRegistry();
  if (registry.timer) return;
  registry.timer = setTimeout(() => {
    registry.timer = null;
    void runPhiSearchIndex();
  }, PHI_SEARCH_INDEX_DEBOUNCE_MS);
  // A timer must not keep a process alive that is otherwise done.
  registry.timer.unref?.();
}

/**
 * Indexes every registered Area now, or queues one more run when one is under way. The promise settles
 * when this run is done; it never rejects -- a failed Area is logged and the others are still written.
 */
function runPhiSearchIndex(): Promise<void> {
  const registry = readRegistry();
  if (registry.running) {
    registry.queued = true;
    return registry.running;
  }
  registry.running = (async () => {
    try {
      await indexRegisteredAreas(registry);
    } catch (error) {
      console.error("[phis-ui] The search index run failed.", error);
    } finally {
      registry.running = null;
      if (registry.queued) {
        registry.queued = false;
        schedulePhiSearchIndexRun();
      }
    }
  })();
  return registry.running;
}

async function indexRegisteredAreas(registry: PhiSearchIndexRegistry) {
  const first = registry.bridges.values().next().value;
  const bridgeRuntime = first?.runtime;
  if (!first || !bridgeRuntime) return;
  const credentials = {
    apiBaseUrl: bridgeRuntime.apiBaseUrl,
    internalToken: bridgeRuntime.internalToken,
    siteKey: bridgeRuntime.siteKey,
  };
  const failures: PhiSearchWidgetFailures = new Map();
  const held = await fetchPhiSiteSearchIndexStates(credentials);
  const heldFingerprint = (areaMask: number, locale: string) =>
    held.find((state) => state.areaMask === areaMask && state.locale === locale)?.fingerprint ?? null;

  for (const area of PHI_SEARCH_INDEX_AREAS) {
    const bridge = registry.bridges.get(area);
    if (!bridge) continue;
    try {
      await indexArea({ area, bridge, credentials, heldFingerprint, failures });
    } catch (error) {
      console.error(`[phis-ui] Indexing the ${area} Area for search failed.`, error);
    }
  }
  for (const [widgetType, failure] of failures) {
    console.error(
      `[phis-ui] The search index could not read the Widget "${widgetType}" on ${failure.pages} page(s) in this run; first on ${failure.first}.`,
      failure.error,
    );
  }
}

type PhiSearchIndexCredentials = { apiBaseUrl: string; internalToken: string; siteKey: string };

/**
 * The reader an Area is indexed as: the Public Area's anonymous visitor, the App's signed-in member who
 * holds no role -- the least any member holds, so what they may read every member may read.
 */
function asIndexingReader(context: PhiSiteRequestContext, area: PhiSearchIndexArea): PhiSiteRequestContext {
  if (area === "public") return context;
  return {
    ...context,
    viewer: {
      ...context.viewer,
      access: "authenticated",
      roleClaims: [],
      groupClaims: [],
      addonRoleClaims: [],
    },
  };
}

async function indexArea({
  area,
  bridge,
  credentials,
  heldFingerprint,
  failures,
}: {
  area: PhiSearchIndexArea;
  bridge: PhiCmsSiteBridge;
  credentials: PhiSearchIndexCredentials;
  heldFingerprint: (areaMask: number, locale: string) => string | null;
  failures: PhiSearchWidgetFailures;
}) {
  const { apiBaseUrl, internalToken, siteKey } = credentials;
  const catalog = resolvePhiCmsDescriptorCatalog(bridge.runtimeModuleCatalog);
  const shellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, area);
  if (!shellBinding) {
    console.warn(`[phis-ui] The ${area} Area has no shell preset; nothing to index.`);
    return;
  }
  const sourcePreset = {
    ownerModuleId: shellBinding.descriptor.ownerModuleId,
    presetKey: shellBinding.descriptor.presetKey,
  };
  const areaMask = area === "public" ? 1 : 2;

  // The Site's languages and its server, read once as the anonymous reader; the locale is per set.
  const anonymous = await loadPhiSiteRequestContext(siteKey, "", "", apiBaseUrl, internalToken);
  // The Site config's change markers, from the same answer the context above was built from.
  const { readMarker, translationMarkers } = await getResolvedSiteConfig({ apiBaseUrl, internalToken, siteKey });
  const locales = anonymous.site.availableLocales.map((option) => option.code);
  const { area: areaPreset, publishedPages } = await getSiteAreaWithPublishedPages({
    apiBaseUrl,
    internalToken,
    siteKey,
    locale: anonymous.site.defaultLocale,
    sourcePreset,
    area,
  });
    const { activeModuleIds, routeTable } = resolvePhiAreaRouteScope({
    runtimeModuleCatalog: bridge.runtimeModuleCatalog,
    catalog,
    area,
    preset: areaPreset?.preset ?? null,
    serverCapabilities: anonymous.serverCapabilities,
  });
  if (!activeModuleIds.has(PHI_SEARCH_RUNTIME_MODULE_ID)) return;
  const candidates = collectPhiSitemapCandidates({
    moduleRoutes: [...routeTable.exactByPath].map(([path, descriptor]) => [path, descriptor] as const),
    publishedPages,
  });
  /*
   * The read marker and the translation markers are in here because what a Page says is not only its
   * structure: a Widget bound to content reads the content's published version, and every text is
   * translated. Publishing content moves the read marker (the Site's publish triggers), correcting a
   * translation moves a translation marker, and without them here either left the old words in the
   * index. The price is a run per published change, which is what SEARCH.md promises.
   *
   * The build is in here because what a document contains depends on the code that builds it (phis-ui,
   * the Site package, the Modules), and no list of inputs can name that. A new build of the Site is
   * therefore a reason to write again, and the build's id says exactly that. The consequence is one run
   * per Area and language after every rollout, and none between.
   */
  const fingerprint = createHash("sha256").update(JSON.stringify({
    build: getPhiSiteBuildId(),
    area,
    publishedPages,
    areaPreset: areaPreset?.preset ?? null,
    activeModuleIds: [...activeModuleIds].sort(),
    locales,
    readMarker,
    translationMarkers,
  })).digest("hex");

  // The Area's Module scope as the live render resolves it: the preset's selection, the locked ones implied.
  const { moduleSet } = await resolvePhiCmsAreaRuntimeModuleScope({
    cmsBridge: bridge,
    area,
    areaPreset: areaPreset?.preset ?? null,
    serverCapabilities: anonymous.serverCapabilities,
  });
  // The same access registry the live render filters a Page's tree with (phi-cms-page-render-scope.tsx).
  const accessRegistry = buildPhiRuntimeModuleAccessRegistry(moduleSet);
  const plugins = new Map<string, Promise<PhiCmsRuntimeWidgetPlugin<unknown> | null>>();
  const loadPlugin = (type: string) => {
    let pending = plugins.get(type);
    if (!pending) {
      pending = (moduleSet.widgetDefinitionsByType.get(type)?.loadRuntime() ?? Promise.resolve(null))
        .catch((error: unknown) => {
          console.error(`[phis-ui] The search index could not load the Widget "${type}".`, error);
          return null;
        });
      plugins.set(type, pending);
    }
    return pending;
  };

  if (locales.length === 0) {
    console.warn(`[phis-ui] The Site names no locales; the ${area} Area is not indexed.`);
    return;
  }
  for (const locale of locales) {
    if (heldFingerprint(areaMask, locale) === fingerprint) continue;
    const context = asIndexingReader(
      await loadPhiSiteRequestContext(siteKey, locale, "", apiBaseUrl, internalToken),
      area,
    );
    const documents = await readDocuments({ bridge, area, locale, context, candidates, loadPlugin, accessRegistry, failures });
    const answer = await putPhiSiteSearchIndexSet({
      ...credentials,
      area,
      locale,
      fingerprint,
      documents,
    });
    if (answer.dropped > 0) {
      console.warn(`[phis-ui] The search index dropped ${answer.dropped} document(s) of the ${area} Area (${locale}).`);
    }
    // One line per set, so an operator's log says when a Site became searchable and how large it is.
    console.info(
      `[phis-ui] Search index ${area}/${locale}: ${answer.accepted ? `${answer.state.documentCount} documents written` : "already held"}.`,
    );
  }
}

async function readDocuments({
  bridge,
  area,
  locale,
  context,
  candidates,
  loadPlugin,
  accessRegistry,
  failures,
}: {
  bridge: PhiCmsSiteBridge;
  area: PhiSearchIndexArea;
  locale: string;
  context: PhiSiteRequestContext;
  candidates: readonly { path: string }[];
  loadPlugin: (type: string) => Promise<PhiCmsRuntimeWidgetPlugin<unknown> | null>;
  accessRegistry: PhiSearchAccessRegistry;
  failures: PhiSearchWidgetFailures;
}): Promise<PhiSearchDocument[]> {
  const documents = new Array<PhiSearchDocument | null>(candidates.length).fill(null);
  let next = 0;
  async function work() {
    while (next < candidates.length) {
      const index = next++;
      const path = candidates[index]!.path;
      try {
        documents[index] = await readDocument({ bridge, area, locale, context, path, loadPlugin, accessRegistry, failures });
      } catch (error) {
        console.error(`[phis-ui] The search index could not read ${area}:${path} (${locale}).`, error);
      }
    }
  }
  await Promise.all(Array.from({ length: PHI_SEARCH_INDEX_RESOLVE_CONCURRENCY }, work));
  return documents
    .filter((document): document is PhiSearchDocument => document !== null)
    .slice(0, PHI_SEARCH_MAX_DOCUMENTS);
}

/**
 * One Page as a document, or `null` where a reader of this Area would not get one: nothing resolves
 * there, it forwards, it asked to stay out of the index, or its access policy is narrower than the
 * reader's. The words are the Page's title and description and every Widget's own answer, in tree order
 * -- of the Widgets this reader would see: a Layout or Widget with a narrower policy than the Page's is
 * left out here as the live render leaves it out, so its words never reach a reader it is hidden from.
 */
async function readDocument({
  bridge,
  area,
  locale,
  context,
  path,
  loadPlugin,
  accessRegistry,
  failures,
}: {
  bridge: PhiCmsSiteBridge;
  area: PhiCmsAreaKey;
  locale: string;
  context: PhiSiteRequestContext;
  path: string;
  loadPlugin: (type: string) => Promise<PhiCmsRuntimeWidgetPlugin<unknown> | null>;
  accessRegistry: PhiSearchAccessRegistry;
  failures: PhiSearchWidgetFailures;
}): Promise<PhiSearchDocument | null> {
  const resolved = await resolvePhiCmsLookup({
    bridge,
    area,
    locale,
    path,
    cookieHeader: "",
    requestContext: context,
  });
  if (!resolved) return null;
  const page = resolved.page.page;
  if (resolvePhiCmsPageRedirect(page, locale) != null) return null;
  if (resolved.runtime.page?.noindex === true) return null;
  if (!canPhiViewerAccess(resolved.runtime.viewer, page.accessPolicy)) return null;

  /*
   * `searchText` is given the runtime and names it to every helper it reaches (the translation of its
   * texts first of all), so a Widget never depends on a request scope. The scope below is kept for the
   * helpers that still read the request's runtime, since the indexer runs where no request is: at
   * start-up, or on a timer after a publish. A built Site showed this scope not carrying into the
   * Widget's code (the first production index was title and description alone), which is why the
   * runtime is passed and not left to be found.
   */
  const visible = filterPhiCmsRenderableTreeForViewer({
    tree: resolved.page,
    viewer: resolved.runtime.viewer,
    registry: accessRegistry,
  });
  const lines = await runWithPhiRequestRuntime(resolved.runtime, async () => {
    const collected: string[] = [];
    const plugins = await Promise.all(visible.contentWidgets.map((widget) => loadPlugin(widget.widgetType)));
    // The words as the render shows them: translated by the same pass (`server-helpers/cms-widget-texts.ts`).
    const translatedConfigs = await translatePhiWidgetConfigTexts(
      visible.contentWidgets.map((widget, index) => ({
        id: widget.id,
        flags: widget.flags,
        config: widget.config,
        definition: plugins[index]?.searchText ? plugins[index] : null,
      })),
      resolved.runtime,
    );
    for (const [index, widget] of visible.contentWidgets.entries()) {
      const plugin = plugins[index];
      if (!plugin?.searchText) continue;
      try {
        const config = plugin.parseConfig(translatedConfigs.get(widget.id) ?? widget.config);
        collected.push(...await plugin.searchText({ widget, config, runtime: resolved.runtime }));
      } catch (error) {
        // One Widget that cannot say its words costs the Page those words, not the Page; the run names the type once.
        const failure = failures.get(widget.widgetType);
        if (failure) failure.pages += 1;
        else failures.set(widget.widgetType, { pages: 1, first: `${area}:${path} (${locale})`, error });
      }
    }
    return collected;
  });

  return {
    path: page.path,
    title: resolved.runtime.page?.title ?? "",
    description: resolved.runtime.page?.description ?? "",
    text: joinPhiSearchText(lines),
  };
}
