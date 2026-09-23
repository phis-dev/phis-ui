import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

/**
 * The fan-in's own rules, with the request chain stood in for.
 *
 * What is under test is what the door does with the answers it collects: whose card it accepts, what it
 * does when a contributor fails, and who is allowed to see one. Resolving the route, the Area's preset
 * and the viewer is each of those contracts' own business, and importing the real ones here would pull
 * half the Site into a unit test. They answer the same way every time; the providers are the variable.
 *
 * Deliberately left real: `canPhiViewerAccess` and the card id grammar. Those are the rules, and a test
 * that mocked them would only be checking that it had mocked them.
 */

vi.mock("server-only", () => ({}));

const scope = vi.hoisted(() => ({
  viewer: { access: "public" } as { access: "public" | "authenticated" },
  activeModuleIds: new Set<string>(),
}));

vi.mock("../server-helpers/runtime", () => ({
  loadPhiSiteRequestContext: async () => ({ viewer: scope.viewer, serverCapabilities: 0 }),
  buildPhiBlockRuntime: () => ({}),
}));
vi.mock("../server-helpers/request-runtime", () => ({
  runWithPhiRequestRuntime: async (_runtime: unknown, run: () => unknown) => run(),
}));
vi.mock("../server-helpers/cms", () => ({
  getPhiExactSiteArea: async () => null,
}));
vi.mock("../server-helpers/cms-route", () => ({
  resolveCmsRootRoute: async () => ({ area: "admin", locale: "en", cmsPath: "/dashboard" }),
}));
vi.mock("../server-helpers/cms-request", () => ({
  resolveActivePresetModuleKeys: () => scope.activeModuleIds,
}));
vi.mock("../plugins/runtime-modules/descriptor-compiler", () => ({
  resolvePhiCmsDescriptorCatalog: () => ({
    areaDefinitions: new Map([["admin", { accessPolicy: null }]]),
  }),
  resolvePhiCmsAreaShellPresetBinding: () => ({
    descriptor: { ownerModuleId: "@phis/ui/modules/admin", presetKey: "admin-area-preset" },
  }),
  // No route matches, so no card resolves an href. Where a target leads is `resolveCardHref`'s own
  // question and turns on a route table this test has no business compiling.
  compilePhiCmsActiveRouteTable: () => ({ exactByPath: new Map() }),
}));
vi.mock("../helpers/cms-area-config", () => ({
  readPhiAreaPublicRoutePaths: () => [],
  readPhiAreaLandingSelection: () => null,
}));

import { PHI_SHARED_PACKAGE_NAME } from "../constants/package";
import { createPhiRuntimeModuleId } from "../constants/module-identity";
import { PHI_VIEWER_ACCESS_AUTHENTICATED } from "../types/access";
import {
  createPhiDashboardCardId,
  type PhiDashboardCardDescriptor,
  type PhiDashboardCardProvider,
  type PhiDashboardCardRow,
} from "../types/dashboard-cards";
import type { PhiCmsSiteBridge } from "../types/cms-plugins";
import { buildPhiDashboardCardsRouteHandler } from "./dashboard-cards-route";

const CORE = createPhiRuntimeModuleId(PHI_SHARED_PACKAGE_NAME, "core");
const LOCALIZATION = createPhiRuntimeModuleId(PHI_SHARED_PACKAGE_NAME, "localization");
const CORE_CARD = createPhiDashboardCardId(CORE, "uptime");
const LOCALIZATION_CARD = createPhiDashboardCardId(LOCALIZATION, "current-locale");

function card(cardId: string, rest: Partial<PhiDashboardCardDescriptor> = {}) {
  return { cardId, form: "stat", title: cardId, ...rest } as PhiDashboardCardDescriptor;
}

/** A Module that offers exactly these cards and resolves none of them. */
function offers(...cards: readonly PhiDashboardCardDescriptor[]): PhiDashboardCardProvider {
  return {
    listCards: () => cards,
    resolveCard: (cardId) => ({ cardId, resolvedAt: "", error: null }),
  };
}

/**
 * A Site running exactly these Modules, each contributing its card provider.
 *
 * An `Error` in place of a provider is a Module whose contribution does not load at all -- a separate
 * failure from a provider that loads and then throws, and the door has to survive both.
 */
function siteWith(modules: Readonly<Record<string, PhiDashboardCardProvider | Error>>) {
  scope.activeModuleIds = new Set(Object.keys(modules));
  return {
    runtime: { siteKey: "site", apiBaseUrl: "http://core.test", internalToken: "token" },
    runtimeModuleCatalog: new Map(
      Object.entries(modules).map(([moduleId, contribution]) => [
        moduleId,
        {
          dashboardCards: {
            load: async () => {
              if (contribution instanceof Error) {
                throw contribution;
              }
              return contribution;
            },
          },
        },
      ]),
    ),
  } as unknown as PhiCmsSiteBridge;
}

function ask(bridge: PhiCmsSiteBridge, query: Record<string, string> = {}) {
  const handler = buildPhiDashboardCardsRouteHandler({ loadAreaBridge: async () => bridge });
  const params = new URLSearchParams({ area: "admin", path: "/admin/dashboard", ...query });
  return handler({
    url: `http://site.test/api/site/dashboard-cards?${params.toString()}`,
    headers: new Headers(),
  } as unknown as NextRequest);
}

async function listedCardIds(bridge: PhiCmsSiteBridge) {
  const response = await ask(bridge);
  const body = (await response.json()) as { cards: readonly PhiDashboardCardRow[] };
  return body.cards.map((row) => row.cardId);
}

describe("buildPhiDashboardCardsRouteHandler", () => {
  beforeEach(() => {
    scope.viewer = { access: "public" };
    // The door reports every refusal it makes; a passing test should not have to print them.
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("leaves out a card its own Module does not own", async () => {
    const ids = await listedCardIds(siteWith({
      [CORE]: offers(card(CORE_CARD), card(LOCALIZATION_CARD)),
    }));
    expect(ids).toEqual([CORE_CARD]);
  });

  it("leaves out a card named outside the grammar", async () => {
    const ids = await listedCardIds(siteWith({
      [CORE]: offers(card(CORE_CARD), card("uptime")),
    }));
    expect(ids).toEqual([CORE_CARD]);
  });

  it("keeps the other Modules' cards when one contributor's list throws", async () => {
    const ids = await listedCardIds(siteWith({
      [CORE]: {
        listCards: () => {
          throw new Error("no.");
        },
        resolveCard: (cardId) => ({ cardId, resolvedAt: "", error: null }),
      },
      [LOCALIZATION]: offers(card(LOCALIZATION_CARD)),
    }));
    expect(ids).toEqual([LOCALIZATION_CARD]);
  });

  it("keeps the other Modules' cards when one contributor cannot be loaded", async () => {
    const ids = await listedCardIds(siteWith({
      [CORE]: new Error("no."),
      [LOCALIZATION]: offers(card(LOCALIZATION_CARD)),
    }));
    expect(ids).toEqual([LOCALIZATION_CARD]);
  });

  it("leaves out a card this viewer may not see", async () => {
    const bridge = siteWith({
      [CORE]: offers(
        card(CORE_CARD, { accessPolicy: PHI_VIEWER_ACCESS_AUTHENTICATED }),
        card(createPhiDashboardCardId(CORE, "open")),
      ),
    });
    expect(await listedCardIds(bridge)).toEqual([createPhiDashboardCardId(CORE, "open")]);

    scope.viewer = { access: "authenticated" };
    expect(await listedCardIds(bridge)).toContain(CORE_CARD);
  });

  it("refuses a payload for a card no active Module owns", async () => {
    const response = await ask(
      siteWith({ [CORE]: offers(card(CORE_CARD)) }),
      { card: LOCALIZATION_CARD },
    );
    expect(response.status).toBe(404);
  });

  it("refuses a card name that is not one", async () => {
    const response = await ask(siteWith({ [CORE]: offers(card(CORE_CARD)) }), { card: "uptime" });
    expect(response.status).toBe(400);
  });

  /*
   * A payload that throws is one card saying so. The card is already on screen -- it was in the list --
   * so the answer is an error inside it rather than a status the browser can only read as "the
   * Dashboard is unavailable".
   */
  it("answers a failed payload as an error in that card", async () => {
    const response = await ask(
      siteWith({
        [CORE]: {
          listCards: () => [card(CORE_CARD)],
          resolveCard: () => {
            throw new Error("Core would not say.");
          },
        },
      }),
      { card: CORE_CARD },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      cardId: CORE_CARD,
      error: "Core would not say.",
    });
  });
});
