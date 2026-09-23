import "server-only";

import type { NextRequest } from "next/server";

import {
  isPhiCmsAreaKey,
  resolvePhiCmsAreaMask,
  type PhiCmsAreaKey,
} from "../constants/cms-areas";
import { canPhiViewerAccess } from "../types/access";
import { localizeAreaPath } from "../helpers/locale";
import {
  readPhiAreaLandingSelection,
  readPhiAreaPublicRoutePaths,
} from "../helpers/cms-area-config";
import {
  compilePhiCmsActiveRouteTable,
  resolvePhiCmsAreaShellPresetBinding,
  resolvePhiCmsDescriptorCatalog,
} from "../plugins/runtime-modules/descriptor-compiler";
import { resolveActivePresetModuleKeys } from "../server-helpers/cms-request";
import { getPhiExactSiteArea } from "../server-helpers/cms";
import { resolveCmsRootRoute } from "../server-helpers/cms-route";
import {
  buildPhiBlockRuntime,
  loadPhiSiteRequestContext,
} from "../server-helpers/runtime";
import { runWithPhiRequestRuntime } from "../server-helpers/request-runtime";
import type { PhiCmsSiteBridge, PhiRuntimeModuleId } from "../types/cms-plugins";
import {
  isPhiDashboardCardId,
  type PhiDashboardCardContext,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardId,
  type PhiDashboardCardPayload,
  type PhiDashboardCardRow,
} from "../types/dashboard-cards";
import type { PhiSiteAreaBridgeLoader } from "./site-area-bridges";

/**
 * The Dashboard's two questions, answered in the Site.
 *
 * The list is a fan-in over the Area's active Modules and the payload is one Module doing real work, and
 * neither can be answered anywhere else: the card providers are server code reading label sets and
 * endpoints, the Area's Module catalog lives in this Site's build, and both answers turn on who is
 * asking. A Collection provider in the browser asks here and never learns what stands behind it.
 *
 * Both are one path with query parameters rather than two paths, because the door matches a single
 * segment -- `/api/site/<name>` -- and a second segment would go upstream to Core.
 */

export type PhiDashboardCardsListResponse = {
  cards: readonly PhiDashboardCardRow[];
};

function json(payload: unknown, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

/** An internal path, and only one: a card request never leaves this Site. */
function readInternalPath(value: string | null, requestUrl: string) {
  const normalized = value?.trim() ?? "";
  if (!normalized.startsWith("/") || normalized.startsWith("//")) {
    return null;
  }
  try {
    return new URL(normalized, requestUrl).pathname;
  } catch {
    return null;
  }
}

function splitTargetPath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean).map((segment) => {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  });
  const [root, ...path] = segments;
  return root ? { root, path } : null;
}

/**
 * The path a card's target resolves to, or none.
 *
 * The active route table is already cut to this Area, these Modules and this viewer, so a target that
 * is not in it is a page this person could not open anyway -- and a card that leads nowhere is better
 * than a card that leads to a refusal. A Site that moved the page is why this is a lookup at all.
 */
function resolveCardHref(
  routeTable: ReturnType<typeof compilePhiCmsActiveRouteTable>,
  area: PhiCmsAreaKey,
  locale: string,
  target: PhiDashboardCardDescriptor["target"],
) {
  if (!target) {
    return undefined;
  }
  for (const [path, descriptor] of routeTable.exactByPath) {
    if (descriptor.ownerModuleId === target.ownerModuleId && descriptor.presetKey === target.presetKey) {
      return localizeAreaPath(locale, area, path);
    }
  }
  return undefined;
}

/**
 * Everything the answer needs, resolved once for both questions.
 *
 * `null` is "this Site cannot answer that", and every caller turns it into an empty Dashboard rather
 * than an error: a Dashboard that cannot name its cards is a Dashboard with none.
 */
async function resolveDashboardCardScope({
  bridge,
  area,
  locale,
  path,
  cookieHeader,
}: {
  bridge: PhiCmsSiteBridge;
  area: PhiCmsAreaKey;
  locale: string;
  path: string;
  cookieHeader: string;
}) {
  const runtime = bridge.runtime;
  if (!runtime) {
    return null;
  }
  const { siteKey, apiBaseUrl, internalToken } = runtime;
  const requestContext = await loadPhiSiteRequestContext(
    siteKey,
    locale,
    cookieHeader,
    apiBaseUrl,
    internalToken,
  );
  const catalog = resolvePhiCmsDescriptorCatalog(bridge.runtimeModuleCatalog);
  const areaDefinition = catalog.areaDefinitions.get(area);
  const shellBinding = resolvePhiCmsAreaShellPresetBinding(catalog, area);
  if (
    !areaDefinition ||
    !shellBinding ||
    !canPhiViewerAccess(requestContext.viewer, areaDefinition.accessPolicy)
  ) {
    return null;
  }

  const areaPreset = await getPhiExactSiteArea({
    path,
    apiBaseUrl,
    internalToken,
    siteKey,
    locale,
    cookieHeader,
    sourcePreset: {
      ownerModuleId: shellBinding.descriptor.ownerModuleId,
      presetKey: shellBinding.descriptor.presetKey,
    },
  });
  const activeModuleIds = resolveActivePresetModuleKeys(
    bridge.runtimeModuleCatalog,
    area,
    areaPreset ? { preset: areaPreset.preset } : null,
    requestContext.serverCapabilities,
    requestContext.viewer,
  );
  const routeTable = compilePhiCmsActiveRouteTable({
    catalog,
    area,
    activeModuleIds,
    viewer: requestContext.viewer,
    publicRoutePaths: readPhiAreaPublicRoutePaths(areaPreset?.preset.preset.config),
    landingSelection: readPhiAreaLandingSelection(areaPreset?.preset.preset.config),
  });

  const cardContext: PhiDashboardCardContext = {
    apiBaseUrl,
    internalToken,
    siteKey,
    cookieHeader,
    locale,
    area,
    viewer: requestContext.viewer,
  };
  /*
   * A route handler has no request runtime bound, and the label sets a card reads for its own title
   * expect one globally. The scope gives every provider call one for exactly this unit of work.
   */
  const scopeRuntime = buildPhiBlockRuntime({
    requestContext,
    areaMask: resolvePhiCmsAreaMask(area),
  });

  return { activeModuleIds, routeTable, cardContext, scopeRuntime };
}

/**
 * The card providers of the Modules this Area actually runs.
 *
 * Keyed by Module so a payload request can find the one that owns a card without asking the other
 * eleven, and loaded here rather than at module scope because a Site whose Dashboard nobody opens
 * should never pull a provider into its graph.
 */
async function loadActiveCardProviders(
  bridge: PhiCmsSiteBridge,
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>,
) {
  const loaded = await Promise.all(
    [...activeModuleIds].map(async (moduleId) => {
      const contribution = bridge.runtimeModuleCatalog.get(moduleId)?.dashboardCards;
      if (!contribution) {
        return null;
      }
      try {
        return [moduleId, await contribution.load()] as const;
      } catch (error) {
        console.warn("[phi-dashboard-cards] Card provider failed to load.", { moduleId, error });
        return null;
      }
    }),
  );
  return loaded.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

/**
 * A card belongs to the Module that offered it, and says so in its own id.
 *
 * The check is here rather than in the catalog because the list is a server call: what a Module returns
 * is known only once it has been asked. A Module answering for somebody else's card is refused for the
 * same reason the catalog refuses a duplicate Widget type -- a card quietly losing to another Module's
 * is a fault that surfaces much later.
 */
function ownsCardId(moduleId: PhiRuntimeModuleId, cardId: string) {
  return isPhiDashboardCardId(cardId) && cardId.startsWith(`${moduleId}/cards/`);
}

export function buildPhiDashboardCardsRouteHandler({
  loadAreaBridge,
}: {
  loadAreaBridge: PhiSiteAreaBridgeLoader;
}) {
  return async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const area = requestUrl.searchParams.get("area")?.trim().toLowerCase() ?? "";
    const pathname = readInternalPath(requestUrl.searchParams.get("path"), request.url);
    const card = requestUrl.searchParams.get("card")?.trim() ?? "";

    if (!isPhiCmsAreaKey(area) || !pathname || (card && !isPhiDashboardCardId(card))) {
      return json({ error: "bad_request" }, 400);
    }

    const bridge = await loadAreaBridge(area);
    const target = splitTargetPath(pathname);
    if (!bridge?.runtime || !target) {
      return json({ cards: [] } satisfies PhiDashboardCardsListResponse);
    }

    try {
      /*
       * The locale is resolved here rather than taken from the caller. The Widget knows which Area it
       * was placed in -- a page belongs to one -- but the language a card speaks is the request's own
       * answer, and a parameter for it is a second place for it to be wrong.
       */
      const resolvedRoute = await resolveCmsRootRoute(target.root, target.path, bridge.runtime);
      if (resolvedRoute.area !== area) {
        return json({ cards: [] } satisfies PhiDashboardCardsListResponse);
      }
      const scope = await resolveDashboardCardScope({
        bridge,
        area,
        locale: resolvedRoute.locale,
        path: resolvedRoute.cmsPath,
        cookieHeader: request.headers.get("cookie") ?? "",
      });
      if (!scope) {
        return json({ cards: [] } satisfies PhiDashboardCardsListResponse);
      }
      const { activeModuleIds, routeTable, cardContext, scopeRuntime } = scope;
      const providers = await loadActiveCardProviders(bridge, activeModuleIds);

      if (card) {
        const owner = providers.find(([moduleId]) => ownsCardId(moduleId, card));
        if (!owner) {
          return json({ error: "unknown_card" }, 404);
        }
        /*
         * A payload that throws is this card saying so, not the request failing. The card is on screen
         * already -- it was in the list -- so the honest answer is an error in it rather than a status
         * the browser can only report as "unavailable".
         */
        try {
          const payload = await runWithPhiRequestRuntime(
            scopeRuntime,
            () => owner[1].resolveCard(card as PhiDashboardCardId, cardContext),
          );
          return json(payload satisfies PhiDashboardCardPayload);
        } catch (error) {
          console.warn("[phi-dashboard-cards] Card payload failed.", { card, error });
          return json({
            cardId: card as PhiDashboardCardId,
            error: error instanceof Error ? error.message : "This card could not be resolved.",
            resolvedAt: new Date().toISOString(),
          } satisfies PhiDashboardCardPayload);
        }
      }

      /*
       * Every Module is asked at once. One that throws loses its own cards and nobody else's, which is
       * the list-half of the same promise the payloads keep: a broken contributor is a gap, not a blank
       * Dashboard.
       */
      const lists = await Promise.all(
        providers.map(async ([moduleId, provider]) => {
          try {
            const cards = await runWithPhiRequestRuntime(
              scopeRuntime,
              () => provider.listCards(cardContext),
            );
            return cards.filter((descriptor) => {
              if (!ownsCardId(moduleId, descriptor.cardId)) {
                console.warn("[phi-dashboard-cards] Module offered a card it does not own.", {
                  moduleId,
                  cardId: descriptor.cardId,
                });
                return false;
              }
              return canPhiViewerAccess(cardContext.viewer, descriptor.accessPolicy);
            });
          } catch (error) {
            console.warn("[phi-dashboard-cards] Card list failed.", { moduleId, error });
            return [];
          }
        }),
      );

      /*
       * Ordered by the id, which is to say by the Module that owns it.
       *
       * Not a statement about importance: DASHBOARD.md section 9 leaves ordering open on purpose,
       * because a Module that could state its own position would turn the Dashboard into a contest. This
       * is the one order that is stable across restarts and decided by nobody, and it holds until the
       * Site's own decisions arrive to replace it.
       */
      const cards = lists
        .flat()
        .sort((left, right) => left.cardId.localeCompare(right.cardId))
        .map((descriptor): PhiDashboardCardRow => ({
          cardId: descriptor.cardId,
          form: descriptor.form,
          title: descriptor.title,
          ...(descriptor.eyebrow ? { eyebrow: descriptor.eyebrow } : {}),
          ...(descriptor.description ? { description: descriptor.description } : {}),
          ...(descriptor.mark ? { mark: descriptor.mark } : {}),
          ...(() => {
            const href = resolveCardHref(routeTable, area, cardContext.locale, descriptor.target);
            return href ? { href } : {};
          })(),
        }));

      return json({ cards } satisfies PhiDashboardCardsListResponse);
    } catch (error) {
      console.warn("[phi-dashboard-cards] Request failed.", { area, card, error });
      return json({ error: "unavailable" }, 503);
    }
  };
}
