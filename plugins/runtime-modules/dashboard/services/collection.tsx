"use client";

import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";

import {
  PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
  PHI_DASHBOARD_CARD_ITEM_RENDERER_KEY,
  PHI_DASHBOARD_CARD_RESOURCE_KEY,
} from "../../../../constants/dashboard-card-provider-keys";
import type { PhiCollectionProviderQueryRequest } from "../../../../types/collection-provider";
import {
  PhiCollectionProviderClient,
  type PhiCollectionProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-collection-provider";
import type { PhiDashboardCardRow } from "../../../../types/dashboard-cards";

/**
 * The fan-in, from the browser's side: one request, and no idea what stands behind it.
 *
 * Everything that decides which cards exist -- the Area's Module catalog, each contributor's own list,
 * who is looking -- is server knowledge, so this asks the Site's own door and passes the answer on as
 * ordinary Collection rows. That is the whole reason the door exists: a Module definition must never
 * reach the browser, and a provider that collected the contributions here would drag every one of them
 * in with it.
 *
 * It sends where it stands. The Area is config, because a page belongs to one and the preset that
 * placed this Widget knows which; the path is read live, because that is what changes when a Site puts
 * a Dashboard somewhere else.
 */

type PhiDashboardCardsResponse = {
  cards?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readCardRows(payload: PhiDashboardCardsResponse) {
  return Array.isArray(payload.cards)
    ? payload.cards.filter(isRecord).map((card) => ({ ...card }) as unknown as PhiDashboardCardRow)
    : [];
}

async function queryDashboardCards(
  request: PhiCollectionProviderQueryRequest,
  pathname: string,
) {
  if (request.resourceKey !== PHI_DASHBOARD_CARD_RESOURCE_KEY) {
    throw new Error(`Unknown Dashboard collection "${request.resourceKey}".`);
  }
  const area = typeof request.params?.area === "string" ? request.params.area : "";
  if (!area) {
    return {
      resourceKey: request.resourceKey,
      items: [],
      total: 0,
      loading: false,
      error: "The Dashboard Widget names no Area.",
    };
  }

  const params = new URLSearchParams({ area, path: pathname });
  try {
    const response = await fetch(`/api/site/dashboard-cards?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "include",
      signal: request.signal,
    });
    if (!response.ok) {
      throw new Error(`Dashboard cards request failed (${response.status}).`);
    }
    const rows = readCardRows((await response.json()) as PhiDashboardCardsResponse);
    return {
      resourceKey: request.resourceKey,
      items: rows as unknown as Record<string, unknown>[],
      total: rows.length,
      loading: false,
      error: null,
    };
  } catch (error) {
    if (request.signal.aborted) {
      throw error;
    }
    return {
      resourceKey: request.resourceKey,
      items: [],
      total: 0,
      loading: false,
      error: error instanceof Error ? error.message : "Dashboard cards are unavailable.",
    };
  }
}

export function PhiDashboardCardCollectionProviderClient({ children }: { children: ReactNode }) {
  /*
   * Where this Widget stands, live. A registration built once at module scope could not know it, and a
   * Dashboard placed on a second page would ask about the first one's.
   */
  const pathname = usePathname() ?? "/";
  const registration = useMemo<PhiCollectionProviderRegistration>(() => ({
    key: PHI_DASHBOARD_CARD_DATA_PROVIDER_KEY,
    query: (request) => queryDashboardCards(request, pathname),
    resources: [{
      resourceKey: PHI_DASHBOARD_CARD_RESOURCE_KEY,
      itemRendererKey: PHI_DASHBOARD_CARD_ITEM_RENDERER_KEY,
    }],
  }), [pathname]);

  return (
    <PhiCollectionProviderClient registration={registration}>
      {children}
    </PhiCollectionProviderClient>
  );
}
