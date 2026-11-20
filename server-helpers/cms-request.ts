import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import {
  resolvePhiCmsAreaKey,
  resolvePhiCmsAreaMask,
  type PhiCmsAreaKey,
} from "../constants/cms-areas";
import type {
  PhiCmsAreaModulesSelection,
  PhiCmsResolvedPageMeta,
  PhiResolvedCmsAreaPresetPayload,
  PhiResolvedCmsPagePayload,
} from "../types/cms";
import type {
  PhiCmsAreaShellPresetBinding,
  PhiCmsPresetIdentity,
} from "../types/cms-module-descriptors";
import type { PhiSiteAreaRead } from "../gateway/site-area";
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
  resolvePhiCmsModuleNavigationFolderTargets,
  resolvePhiCmsRoutePreset,
} from "../plugins/runtime-modules/descriptor-compiler";
import {
  listPhiAlwaysActiveRuntimeModuleIds,
  resolvePhiRuntimeModuleIdsForArea,
} from "../plugins/runtime-modules/settings";
import { composePhiCmsPagePresetOverlays } from "../plugins/runtime-modules/page-preset-overlays";
import { resolvePhiCmsRoutePage } from "../plugins/runtime-modules/route-page-resolution";
import { PhiCmsFlags } from "../constants/phi-cms";
import { hasPhiFlag } from "../helpers/flags";
import { resolvePhiRuntimeModuleServerBinding } from "../plugins/runtime-modules/server-capabilities";
import { resolvePhiAuthUiRuntimeProjection } from "./auth-ui-provider";
import {
  applyPhiBackgroundAssetProjection,
  resolvePhiBackgroundAssetProjection,
} from "../components/widgets/helpers/background-reference-resolver.server";
import type { PhiCapabilitySnapshot } from "../types/server-capabilities";
import { logRuntimeEvent } from "../net/log";
import { getPhiCmsPage, getPhiExactSiteArea } from "./cms";
import { buildPhiLocalCmsAreaPayload } from "./cms-area";
import { applyPhiPresetTreePublishedContent } from "./cms-bound-content";
import { resolvePhiCmsPageRecord } from "./cms-page-record";
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
} from "./runtime";
import { trForLocale } from "./translate";
import {
  readPhiAreaLandingSelection,
  readPhiAreaPublicRoutePaths,
  readPhiAreaSelectionRuntimeModuleIds,
} from "../helpers/cms-area-config";
import { readPhiServerApiCredentials } from "../helpers/phis-server-credentials";
import { createPhiModuleMediaLoader } from "../gateway/server-module-media";
import type { PhiSiteRequestContext } from "../types/site-request-context";

type LoadPhiResolvedCmsPage = (
  path: string,
  sourcePreset?: { ownerModuleId: PhiRuntimeModuleId; presetKey: string } | null,
) => Promise<PhiResolvedCmsPagePayload | null>;
/**
 * The Area read a resolution makes: `"live"` is what a visitor is served, `"requested"` the revision or
 * review the request names, if it names one of the Area. Without `sourcePreset` the live read answers the
 * selection and the one stored structure together (`PhiSiteAreaRead`).
 */
type LoadPhiCmsArea = (
  path: string,
  request: { sourcePreset: PhiCmsPresetIdentity | null; stage: "live" | "requested" },
) => Promise<PhiSiteAreaRead | null>;

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
  loadCmsArea: LoadPhiCmsArea;
  /** Whether the request names a revision or a review of the Area, which the `"requested"` read answers. */
  previewsArea?: boolean;
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
    page: await applyPhiPresetTreePublishedContent(await instantiatePhiCmsRoutePreset({
      binding,
      catalog,
      activeModuleIds: activeModuleKeys,
      siteId,
      path: requestedPath,
      runtime,
      loadModuleMedia: createPhiModuleMediaLoader(runtime.site.key),
      // The route's title is the owning Module's text, written in that Module's language.
      resolveMissingPageTitle: (sourceTitle) => trForLocale(
        runtime.locale.current,
        sourceTitle,
        0,
        0,
        "text",
        catalog.sourceLocaleByModuleId.get(binding.descriptor.ownerModuleId),
      ),
    }), { runtimeModuleCatalog, siteKey: runtime.site.key, locale: runtime.locale.current }),
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

/** What an Area stores, as far as answering a request goes: its Module selection and its structure. */
export type PhiCmsAreaStoredRead = Pick<PhiSiteAreaRead, "modules" | "structure">;

function isPhiCmsAreaShellStructure(
  structure: PhiResolvedCmsAreaPresetPayload | null | undefined,
  binding: PhiCmsAreaShellPresetBinding,
): structure is PhiResolvedCmsAreaPresetPayload {
  return structure != null
    && structure.sourcePreset?.ownerModuleId === binding.descriptor.ownerModuleId
    && structure.sourcePreset?.presetKey === binding.descriptor.presetKey;
}

/**
 * What an Area answers: the active Module ids, the effective shell, the stored structure where it
 * stands on that shell, and the route table compiled from them.
 *
 * In that order, because each step needs the one before. The selection decides the active Modules; the
 * active Modules decide the shell (`resolvePhiCmsAreaShellPresetBinding`: the one active Module that
 * brings one, otherwise the base); and a stored structure applies only when its identity is that
 * shell's -- a Site that stored a base structure and then switched a shell provider on sees the
 * provider's shell, and its own structure again once the provider is off. `structure` is null where
 * the shell's preset answers; the caller builds it (`buildPhiLocalCmsAreaPayload`) only if it needs it.
 *
 * Nine readers -- the page request, the root shell, the dashboard cards, the navigation targets, the
 * page references, the public login, the search index and two more -- each wrote these steps out.
 * Stated once, the readers cannot drift in which shell and which config they compile from.
 */
export function resolvePhiAreaRouteScope(input: {
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  catalog: ReturnType<typeof resolvePhiCmsDescriptorCatalog>;
  area: PhiCmsAreaKey;
  read: PhiCmsAreaStoredRead | null;
  serverCapabilities: PhiCapabilitySnapshot | null;
}) {
  const activeModuleIds = resolveActivePresetModuleKeys(
    input.runtimeModuleCatalog,
    input.area,
    input.read?.modules ?? null,
    input.serverCapabilities,
  );
  const shellBinding = resolvePhiCmsAreaShellPresetBinding(input.catalog, input.area, activeModuleIds);
  if (!shellBinding) {
    throw new Error(`Area "${input.area}" has no shell preset binding.`);
  }
  const structure = isPhiCmsAreaShellStructure(input.read?.structure, shellBinding)
    ? input.read!.structure!
    : null;
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog: input.catalog,
    area: input.area,
    activeModuleIds,
    publicRoutePaths: readPhiAreaPublicRoutePaths(input.read?.modules?.config),
    landingSelection: readPhiAreaLandingSelection(structure?.preset.preset.config),
  });
  return { activeModuleIds, routeTable, shellBinding, structure };
}

/**
 * What the Area stores for a request that may preview or review one of its revisions.
 *
 * A live request is one read without an identity: the selection and the one stored structure come
 * together, and `resolvePhiAreaRouteScope` drops the structure if it stands on another shell. A
 * revision or a review of the Area answers a structure only under the identity it names, and the shell
 * that identity has to be depends on the selection -- which the reviewed revision may itself be. So it
 * reads the live Area first, asks the reviewed revision under the shell the live selection chooses, and
 * takes, under the shell the reviewed selection chooses, the reviewed structure or else the live one.
 * Only previews pay the second read.
 */
export async function readPhiCmsAreaForRequest({
  loadArea,
  previewsArea,
  resolveShellSource,
}: {
  loadArea: (request: { sourcePreset: PhiCmsPresetIdentity | null; stage: "live" | "requested" }) =>
    Promise<PhiSiteAreaRead | null>;
  previewsArea: boolean;
  resolveShellSource: (modules: PhiCmsAreaModulesSelection | null) =>
    PhiCmsPresetIdentity | Promise<PhiCmsPresetIdentity>;
}): Promise<PhiCmsAreaStoredRead> {
  const live = await loadArea({ sourcePreset: null, stage: "live" });
  const liveRead: PhiCmsAreaStoredRead = { modules: live?.modules ?? null, structure: live?.structure ?? null };
  if (!previewsArea) {
    return liveRead;
  }
  const reviewed = await loadArea({
    sourcePreset: await resolveShellSource(liveRead.modules),
    stage: "requested",
  });
  // Not there, or a structure revision of a shell the Area does not take: what is live answers.
  if (!reviewed) {
    return liveRead;
  }
  const shellSource = await resolveShellSource(reviewed.modules);
  const standsOnShell = (structure: PhiResolvedCmsAreaPresetPayload | null) =>
    structure?.sourcePreset.ownerModuleId === shellSource.ownerModuleId
    && structure.sourcePreset.presetKey === shellSource.presetKey;
  return {
    modules: reviewed.modules,
    structure: [reviewed.structure, liveRead.structure].find(standsOnShell) ?? null,
  };
}

/** The identity of the shell an Area takes under a selection, for `readPhiCmsAreaForRequest`. */
export function resolvePhiCmsAreaShellSource(input: {
  runtimeModuleCatalog: PhiRuntimeModuleCatalog;
  area: PhiCmsAreaKey;
  modules: PhiCmsAreaModulesSelection | null;
  serverCapabilities: PhiCapabilitySnapshot | null;
}): PhiCmsPresetIdentity {
  const catalog = resolvePhiCmsDescriptorCatalog(input.runtimeModuleCatalog);
  const binding = resolvePhiCmsAreaShellPresetBinding(
    catalog,
    input.area,
    resolveActivePresetModuleKeys(input.runtimeModuleCatalog, input.area, input.modules, input.serverCapabilities),
  );
  if (!binding) {
    throw new Error(`Area "${input.area}" has no shell preset binding.`);
  }
  return { ownerModuleId: binding.descriptor.ownerModuleId, presetKey: binding.descriptor.presetKey };
}

function resolveActivePresetModuleKeys(
  runtimeModuleCatalog: PhiRuntimeModuleCatalog,
  area: PhiCmsAreaKey,
  modules: PhiCmsAreaModulesSelection | null,
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
  const configuredModuleKeys = readPhiAreaSelectionRuntimeModuleIds(modules, area);
  const moduleDefinitions = [...runtimeModuleCatalog.values()].map((entry) => entry.definition);
  // The Modules declared `activation: "always"` come first and on the same terms as the selected ones:
  // the active set here has to be the one `resolvePhiRuntimeModuleSet` builds for the render.
  for (const moduleKey of [
    ...listPhiAlwaysActiveRuntimeModuleIds(area, moduleDefinitions),
    ...resolvePhiRuntimeModuleIdsForArea(area, configuredModuleKeys, moduleDefinitions),
  ]) {
    const definition = runtimeModuleCatalog.get(moduleKey)?.definition;
    if (definition) {
      // A Module is on for an Area or it is not. It is never switched off for one reader (ACCESS.md):
      // what its Widgets show may differ per person, that it is loaded may not.
      const bindingResolution = resolvePhiRuntimeModuleServerBinding(
        definition.serverBinding,
        serverCapabilities,
      );
      if (!bindingResolution.available) {
        // The Module is active and installed, and the server half it needs is not there. It stays off
        // for the whole Area -- and the log names it, because the page it leaves looks like a page the
        // Site chose.
        logRuntimeEvent("warn", "runtime_modules.server_capability.unavailable", {
          message: "An active Module is off: its server capability requirement is unavailable.",
          area,
          pluginKey: moduleKey,
          meta: {
            providerId: definition.serverBinding.providerId,
            state: bindingResolution.state,
            diagnosticCode: bindingResolution.diagnosticCode,
            missingCapabilities: bindingResolution.missingCapabilities,
          },
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

/** The record's own title and description on the Page; `msgId: 0`, because they are no Site message. */
function applyPhiPageRecordMeta(
  pagePayload: PhiResolvedCmsPagePayload,
  record: { title: string | null; description: string | null },
): PhiResolvedCmsPagePayload {
  if (!record.title && !record.description) {
    return pagePayload;
  }
  const field = (value: string) => ({ msgId: 0, source: value, value });
  const pageMeta = pagePayload.page.pageMeta;
  return {
    ...pagePayload,
    page: {
      ...pagePayload.page,
      pageMeta: {
        title: record.title ? field(record.title) : pageMeta?.title ?? null,
        description: record.description ? field(record.description) : pageMeta?.description ?? null,
      },
    },
  };
}

function buildPhiRuntimePage(
  pagePayload: PhiResolvedCmsPagePayload,
  record?: NonNullable<PhiBlockRuntime["page"]>["record"],
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
    ...(record ? { record } : {}),
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
  loadCmsArea,
  previewsArea = false,
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
  const areaOwnedStoragePath = resolveAreaOwnedStoragePath(path, areaMask);
  /*
   * The selection first, then the shell it chooses, then the stored structure if it stands on that
   * shell -- one read for a page view (`readPhiCmsAreaForRequest`).
   */
  const storedArea = await readPhiCmsAreaForRequest({
    loadArea: (request) => loadCmsArea(path, request),
    previewsArea,
    resolveShellSource: (modules) => resolvePhiCmsAreaShellSource({
      runtimeModuleCatalog,
      area: requestedAreaKey,
      modules,
      serverCapabilities: resolvedRequestContext.serverCapabilities,
    }),
  });
  const {
    activeModuleIds: activeModuleKeys,
    routeTable,
    shellBinding: areaShellBinding,
    structure: exactAreaPreset,
  } = resolvePhiAreaRouteScope({
    runtimeModuleCatalog,
    catalog,
    area: requestedAreaKey,
    read: storedArea,
    serverCapabilities: resolvedRequestContext.serverCapabilities,
  });
  // Only where nothing is stored on this shell; see the same step in `cms-root.ts`.
  const localAreaPreset = exactAreaPreset
    ? null
    : await buildPhiLocalCmsAreaPayload({
      binding: areaShellBinding,
      areaMask,
      siteId: resolvedRequestContext.site.id,
      path,
      runtime,
      runtimeModuleCatalog,
    });
  const effectiveAreaPreset = exactAreaPreset ?? localAreaPreset;
  const siteId = localAreaPreset?.preset.preset.siteId ?? resolvedRequestContext.site.id;
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
    setPhiRequestNavigationContext(requestedAreaKey, catalog, activeModuleKeys, routeTable);
  }
  const areaAllowed = canPhiViewerAccess(runtime.viewer, areaShellBinding.descriptor.area === requestedAreaKey
    ? catalog.areaDefinitions.get(requestedAreaKey)?.accessPolicy
    : undefined);
  const routeBinding = areaOwnedStoragePath && areaAllowed
    ? resolvePhiCmsRoutePreset(routeTable, areaOwnedStoragePath)
    : null;
  const presetOrigin = { instantiated: false };
  const instantiateRoutePreset = (binding: NonNullable<typeof routeBinding>) => instantiatePhiRoutePresetPage({
    binding,
    requestedPath: path,
    areaMask,
    siteId,
    runtime: runtimeWithAuthProvider,
    runtimeModuleCatalog,
    activeModuleKeys,
  });
  const routePage = await resolvePhiCmsRoutePage({
    binding: routeBinding,
    requestedPath: path,
    loadPage: loadResolvedCmsPage,
    instantiatePreset: (binding) => {
      presetOrigin.instantiated = true;
      return instantiateRoutePreset(binding);
    },
  });
  const routePresetAnswered = routePage?.sourcePreset?.presetKey === routeBinding?.descriptor.presetKey
    && routePage?.sourcePreset?.ownerModuleId === routeBinding?.descriptor.ownerModuleId;

  /*
   * A stored Page that answers for the route's preset holds no copy of the Overlays the preset declares;
   * they are laid over it here, from the preset instantiated beside it (OVERLAYS.md, "Page preset
   * Overlays"). The instantiated preset already has them, an exact Site Page of a dynamic route is its own
   * Page, and a lookup renders nothing.
   */
  const presetOverlayPage = purpose !== "lookup" && routePage && routeBinding && routePresetAnswered
    && !presetOrigin.instantiated
    ? await instantiateRoutePreset(routeBinding)
    : null;
  const loadedPage = routePage && presetOverlayPage
    ? {
        ...routePage,
        page: composePhiCmsPagePresetOverlays({ tree: routePage.page, presetTree: presetOverlayPage.page }),
      }
    : routePage;

  /*
   * The record the Page is about, where its route names one: read once, here, for the Module's own tree
   * and for a stored override of it alike -- the override holds no address, only Widgets bound to the
   * record's fields. A Page stored at this exact address is its own and about no record. An address that
   * names no record is no Page: a 404 while rendering, nothing for a lookup.
   */
  const routeIsParametrised = routeBinding ? Object.keys(routeBinding.params).length > 0 : false;
  const pageRecord = loadedPage && routeBinding && routeIsParametrised && routePresetAnswered
    ? await resolvePhiCmsPageRecord({
        binding: routeBinding,
        runtime: runtimeWithAuthProvider,
        runtimeModuleCatalog,
        activeModuleIds: activeModuleKeys,
      })
    : null;
  if (pageRecord?.status === "missing") {
    if (purpose === "lookup") {
      return null;
    }
    notFound();
  }

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
        routeTable,
      })
    : null;
  /*
   * A folder address, asked only where no Page answers: a path such as `/docs` that is no Page may still be
   * a folder whose Navigation container leads to one. The server follows the published Navigations to a
   * Page reference, and the reference is resolved here, where Module routes are known.
   */
  const folderLookup = !loadedPage && areaAllowed && areaOwnedStoragePath && areaOwnedStoragePath !== "/";
  const siteFolderTargetReference = folderLookup
    ? await fetchSiteNavigationFolderTarget({
        apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
        internalToken: readPhiServerApiCredentials().internalToken,
        siteKey: runtimeWithAuthProvider.site.key,
        area: requestedAreaKey,
        path: areaOwnedStoragePath,
      })
    : null;
  // Where the Site chose no target, a Module container's own (`folderTarget`) answers.
  const folderTargetReference = siteFolderTargetReference ?? (folderLookup
    ? resolvePhiCmsModuleNavigationFolderTargets({
        catalog,
        area: requestedAreaKey,
        activeModuleIds: activeModuleKeys,
        routeTable,
        addresses: [areaOwnedStoragePath],
      }).get(areaOwnedStoragePath) ?? null
    : null);
  const folderTargetPath = folderTargetReference
    ? await resolvePhiAreaPageReferencePath({
        runtime: runtimeWithAuthProvider,
        reference: folderTargetReference as PhiPageReference,
        area: requestedAreaKey,
        routeTable,
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

  if (!effectivePage) {
    return null;
  }
  const resolvedContent = pageRecord ? applyPhiPageRecordMeta(effectivePage, pageRecord) : effectivePage;

  const resolvedRuntime: PhiBlockRuntime = {
    ...runtimeWithAuthProvider,
    page: buildPhiRuntimePage(resolvedContent, pageRecord?.binding),
  };
  if (purpose === "lookup") {
    return {
      areaPreset: effectiveAreaPreset?.preset ?? null,
      areaModules: storedArea.modules,
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

  /*
   * The route's Tour, read from the binding rather than the tree: a Page the Site edited is loaded from
   * its record and never runs the preset's loader, and it is still the Page the Tour was written for.
   * Not for a dynamic route -- an exact Site Page may answer its address -- nor for a root that forwards.
   */
  const routeTour = routeBinding?.descriptor.tour
    && Object.keys(routeBinding.params).length === 0
    && resolvedPage === loadedPage
    ? routeBinding.descriptor.tour
    : null;

  return {
    areaPreset: areaPresetTree && applyPhiBackgroundAssetProjection(areaPresetTree, backgroundAssets),
    areaModules: storedArea.modules,
    page: applyPhiBackgroundAssetProjection(resolvedContent.page, backgroundAssets),
    runtime: resolvedRuntime,
    serverCapabilities: resolvedRequestContext.serverCapabilities,
    pageTour: routeTour
      ? {
          definition: routeTour,
          ownerModuleId: routeBinding!.descriptor.ownerModuleId,
          sourceLocale: catalog.sourceLocaleByModuleId.get(routeBinding!.descriptor.ownerModuleId),
        }
      : null,
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
    previewsArea: revision != null || review?.kind === "area",
    loadCmsArea: (requestPath, { sourcePreset, stage }) =>
      getPhiExactSiteArea({
        path: requestPath,
        siteKey,
        apiBaseUrl,
        internalToken,
        ...(stage === "requested" ? { revision, review } : {}),
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
