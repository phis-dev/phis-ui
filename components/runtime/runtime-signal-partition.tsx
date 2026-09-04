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

/**
 * A signal waiting for the address it names to become usable.
 *
 * `queuedAt` is the moment the route first had something to deliver, not the moment of the value now
 * held: a route that is re-sent while it waits is still the same wait, and the age is what tells a
 * reader whether a late delivery was a mount away or a whole navigation away.
 */
export type PhiPendingSignal = {
  signal: PhiSignal;
  queuedAt: number;
};

export type PhiSignalRuntimePartition = {
  id: string;
  kind: PhiSignalRuntimePartitionKind;
  context: PhiSignalRuntimeContext;
  parent: PhiSignalRuntimePartition | null;
  listeners: Set<(signal: PhiSignal) => void>;
  receiverListenerCounts: Map<PhiSignalAddress, number>;
  instances: Map<PhiSignalAddress, PhiSignalRegistryEntry>;
  instanceSubscribers: Set<() => void>;
  /**
   * Signals held for a receiver that the page revision promises but has not mounted yet.
   *
   * Keyed by receiver, then by emission path, so a route that fires repeatedly while its receiver is
   * still absent leaves one value rather than a backlog. Writing an existing key again keeps that
   * key's position, which is what makes the flush deliver in order of first appearance.
   */
  pendingSignals: Map<PhiSignalAddress, Map<string, PhiPendingSignal>>;
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
    pendingSignals: new Map(),
  }), [area, id, kind, pageKey, parent, regionKey, siteKey, slotKey]);

  useEffect(() => () => {
    /*
     * A signal still waiting when the partition goes away is discarded without complaint.
     *
     * The write path already refuses a route whose receiver is not in the revision, so what is left
     * here can only be a receiver that exists but was never mounted -- a modal nobody opened, a tab
     * nobody expanded. That is ordinary operation, not a defect, and a message would fire for the
     * common case and be ignored by the time it mattered.
     *
     * The debug line below therefore stays at debug and stays out of the production bundle. Do not
     * raise its level: the noise it would make is exactly what this comment exists to prevent.
     */
    if (process.env.NODE_ENV === "development" && partition.pendingSignals.size > 0) {
      const held = [...partition.pendingSignals].map(
        ([receiver, byRoute]) => `${receiver}(${[...byRoute.keys()].join(", ")})`,
      );
      console.debug(
        `[phi-signal] partition "${partition.id}" torn down with ${held.length} receiver(s) never mounted: ${held.join("; ")}`,
      );
    }
    partition.listeners.clear();
    partition.receiverListenerCounts.clear();
    partition.instances.clear();
    partition.instanceSubscribers.clear();
    partition.pendingSignals.clear();
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
