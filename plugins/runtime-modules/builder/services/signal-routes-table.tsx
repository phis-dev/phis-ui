"use client";

import { useMemo, useRef, type ReactNode } from "react";

import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../ids";
import {
  readPhiSignalRouteSet,
  type PhiSignalRouteSet,
} from "../../../../types/signals";
import type {
  PhiTableProviderMutationRequest,
  PhiTableProviderQueryRequest,
} from "../../../../types/table-widget";
import {
  PhiTableProviderClient,
  type PhiTableProviderRegistration,
} from "../../../../components/widgets/client/shared/phi-table-provider";
import { getPhiDeveloperSelectedSignalRoutes } from "../signal-route-selection";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS } from "../../../../plugins/runtime-modules/builder/data-providers";

function resolveSignalRouteRows(routes: PhiSignalRouteSet | null | undefined) {
  return [
    ...(routes?.emits ?? []).map((route) => ({ direction: "emit", ...route })),
    ...(routes?.listens ?? []).map((route) => ({ direction: "listen", ...route })),
  ];
}

function readSessionKey(request: {
  query?: PhiTableProviderQueryRequest["query"];
  params?: Record<string, unknown>;
}) {
  const value = request.query?.filters?.sessionKey ?? request.params?.sessionKey;
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function filterSignalRouteRows(
  rows: ReturnType<typeof resolveSignalRouteRows>,
  query: PhiTableProviderQueryRequest["query"],
) {
  const direction = query.filters?.direction;
  const directionRows = direction === "emit" || direction === "listen"
    ? rows.filter((row) => row.direction === direction)
    : rows;
  const normalized = query.search?.trim().toLowerCase();
  if (!normalized) return directionRows;
  return directionRows.filter((row) => [
    row.direction,
    row.routeKey,
    row.capabilityId,
    row.channel,
    row.action,
    row.valueType,
    row.receiver,
  ].some((value) => String(value ?? "").toLowerCase().includes(normalized)));
}

function routesAreEquivalent(
  left: NonNullable<PhiSignalRouteSet["emits"]>[number],
  right: NonNullable<PhiSignalRouteSet["emits"]>[number],
) {
  return left.capabilityId === right.capabilityId && left.scope === right.scope &&
    left.channel === right.channel && left.action === right.action && left.valueType === right.valueType &&
    (left.valueSchema ?? null) === (right.valueSchema ?? null) && left.receiver === right.receiver;
}

export function PhiBuilderSignalRoutesTableProviderClient({ children }: { children: ReactNode }) {
  const routeTableSessions = useRef(new Map<string, PhiSignalRouteSet>());

  const registration = useMemo<PhiTableProviderRegistration>(() => {
    const query = async (request: PhiTableProviderQueryRequest) => {
      if (request.resourceKey !== "signalRoutes") {
        throw new Error(`Unknown Builder Table resource "${request.resourceKey}".`);
      }
      const sessionKey = readSessionKey(request);
      const currentRoutes = sessionKey
        ? routeTableSessions.current.get(sessionKey) ?? getPhiDeveloperSelectedSignalRoutes("public")
        : getPhiDeveloperSelectedSignalRoutes("public");
      if (sessionKey && !routeTableSessions.current.has(sessionKey)) {
        routeTableSessions.current.set(sessionKey, currentRoutes ?? {});
      }
      const rows = filterSignalRouteRows(resolveSignalRouteRows(currentRoutes), request.query);
      const pageSize = request.query.pageSize && request.query.pageSize > 0 ? request.query.pageSize : 20;
      const page = request.query.page && request.query.page > 0 ? request.query.page : 1;
      return {
        rows: rows.slice((page - 1) * pageSize, page * pageSize),
        total: rows.length,
      };
    };

    const mutate = async (request: PhiTableProviderMutationRequest) => {
      if (request.kind !== "action") {
        throw new Error("Signal Routes supports Table actions only.");
      }
      const sessionKey = readSessionKey(request);
      if (request.resourceKey !== "signalRoutes" || !sessionKey) {
        throw new Error("Invalid Signal Routes Table mutation.");
      }
      const current = routeTableSessions.current.get(sessionKey) ??
        getPhiDeveloperSelectedSignalRoutes("public") ?? {};
      if (request.actionKey === "cancel") {
        routeTableSessions.current.delete(sessionKey);
      } else if (request.actionKey === "delete" && typeof request.rowIdentity === "string") {
        routeTableSessions.current.set(sessionKey, {
          emits: (current.emits ?? []).filter((route) => route.routeKey !== request.rowIdentity),
          listens: (current.listens ?? []).filter((route) => route.routeKey !== request.rowIdentity),
        });
      } else if (request.actionKey === "save" && request.actionValue) {
        const route = readPhiSignalRouteSet({ emits: [request.actionValue] })?.emits?.[0];
        if (!route) throw new Error("Invalid Signal Routes save payload.");
        if ([...(current.emits ?? []), ...(current.listens ?? [])].some((candidate) =>
          candidate.routeKey !== route.routeKey && routesAreEquivalent(candidate, route))) {
          throw new Error("Signal route already exists in this wiring session.");
        }
        const routeExists = [...(current.emits ?? []), ...(current.listens ?? [])]
          .some((candidate) => candidate.routeKey === route.routeKey);
        routeTableSessions.current.set(sessionKey, {
          emits: routeExists
            ? (current.emits ?? []).map((candidate) => candidate.routeKey === route.routeKey ? route : candidate)
            : [...(current.emits ?? []), route],
          listens: (current.listens ?? []).filter((candidate) => candidate.routeKey !== route.routeKey),
        });
      } else if (request.actionKey !== "edit") {
        throw new Error("Unsupported Signal Routes table action.");
      }
      return { status: "accepted" as const, invalidation: "view" as const };
    };

    const descriptor = PHI_BUILDER_RUNTIME_DATA_PROVIDER_DESCRIPTORS.find((candidate) =>
      candidate.key === PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalRoutesTable);
    return {
      key: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.signalRoutesTable,
      resources: descriptor?.kind === "table" ? descriptor.resources : [],
      query,
      mutate,
    };
  }, []);

  return <PhiTableProviderClient registration={registration}>{children}</PhiTableProviderClient>;
}
