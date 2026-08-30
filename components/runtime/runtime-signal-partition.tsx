"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import type {
  PhiSignal,
  PhiSignalAddress,
  PhiSignalRuntimeContext,
} from "../../types";
import type { PhiSignalRegistryEntry } from "./runtime-signal-registry";

export type PhiSignalRuntimePartitionKind = "site" | "area" | "canvas";

export type PhiSignalRuntimePartition = {
  id: string;
  kind: PhiSignalRuntimePartitionKind;
  context: PhiSignalRuntimeContext;
  parent: PhiSignalRuntimePartition | null;
  listeners: Set<(signal: PhiSignal) => void>;
  receiverListenerCounts: Map<PhiSignalAddress, number>;
  instances: Map<PhiSignalAddress, PhiSignalRegistryEntry>;
  instanceSubscribers: Set<() => void>;
};

const PhiSignalRuntimePartitionContext = createContext<PhiSignalRuntimePartition | null>(null);

function normalizeContext(context: PhiSignalRuntimeContext): PhiSignalRuntimeContext {
  return {
    siteKey: context.siteKey ?? null,
    area: context.area ?? null,
    pageKey: context.pageKey ?? null,
    regionKey: context.regionKey ?? null,
    slotKey: context.slotKey ?? null,
  };
}

export function PhiSignalRuntimePartitionProvider({
  id,
  kind,
  context,
  isolated = false,
  children,
}: {
  id: string;
  kind: PhiSignalRuntimePartitionKind;
  context: PhiSignalRuntimeContext;
  isolated?: boolean;
  children: ReactNode;
}) {
  const inheritedPartition = useContext(PhiSignalRuntimePartitionContext);
  const parent = isolated ? null : inheritedPartition;
  const siteKey = context.siteKey ?? null;
  const area = context.area ?? null;
  const pageKey = context.pageKey ?? null;
  const regionKey = context.regionKey ?? null;
  const slotKey = context.slotKey ?? null;
  const partition = useMemo<PhiSignalRuntimePartition>(() => ({
    id,
    kind,
    context: normalizeContext({ siteKey, area, pageKey, regionKey, slotKey }),
    parent,
    listeners: new Set(),
    receiverListenerCounts: new Map(),
    instances: new Map(),
    instanceSubscribers: new Set(),
  }), [area, id, kind, pageKey, parent, regionKey, siteKey, slotKey]);

  useEffect(() => () => {
    partition.listeners.clear();
    partition.receiverListenerCounts.clear();
    partition.instances.clear();
    partition.instanceSubscribers.clear();
  }, [partition]);

  return (
    <PhiSignalRuntimePartitionContext.Provider value={partition}>
      {children}
    </PhiSignalRuntimePartitionContext.Provider>
  );
}

export function usePhiSignalRuntimePartition() {
  const partition = useContext(PhiSignalRuntimePartitionContext);
  if (!partition) {
    throw new Error("Phi signal runtime requires a PhiSignalRuntimePartitionProvider.");
  }
  return partition;
}

export function resolvePhiSiteSignalRuntimePartition(partition: PhiSignalRuntimePartition) {
  let current: PhiSignalRuntimePartition | null = partition;
  while (current?.parent) {
    current = current.parent;
  }
  return current?.kind === "site" ? current : partition;
}
