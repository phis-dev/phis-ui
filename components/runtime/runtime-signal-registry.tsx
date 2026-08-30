"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type {
  PhiSignal,
  PhiSignalAddress,
  PhiSignalRuntimeContext,
} from "../../types";
import { createPhiCoreRuntimeControllerAddress } from "./core-runtime-controller-address";
import {
  resolvePhiSiteSignalRuntimePartition,
  usePhiSignalRuntimePartition,
  type PhiSignalRuntimePartition,
} from "./runtime-signal-partition";

export type PhiSignalRegistryEntry = {
  address: PhiSignalAddress;
  scope: PhiSignal["scope"];
  context?: PhiSignalRuntimeContext;
  active?: boolean;
};

function normalizePhiSignalRuntimeContext(
  context: PhiSignalRuntimeContext | null | undefined,
): PhiSignalRuntimeContext {
  return {
    siteKey: context?.siteKey ?? null,
    area: context?.area ?? null,
    pageKey: context?.pageKey ?? null,
    regionKey: context?.regionKey ?? null,
    slotKey: context?.slotKey ?? null,
  };
}

export function matchesPhiSignalRuntimeContext(
  expected: PhiSignalRuntimeContext | null | undefined,
  current: PhiSignalRuntimeContext,
) {
  if (!expected) {
    return true;
  }

  const normalizedExpected = normalizePhiSignalRuntimeContext(expected);
  const normalizedCurrent = normalizePhiSignalRuntimeContext(current);
  return (
    (normalizedCurrent.siteKey == null || normalizedExpected.siteKey == null || normalizedExpected.siteKey === normalizedCurrent.siteKey) &&
    (normalizedCurrent.area == null || normalizedExpected.area == null || normalizedExpected.area === normalizedCurrent.area) &&
    (normalizedCurrent.pageKey == null || normalizedExpected.pageKey == null || normalizedExpected.pageKey === normalizedCurrent.pageKey) &&
    (normalizedCurrent.regionKey == null || normalizedExpected.regionKey == null || normalizedExpected.regionKey === normalizedCurrent.regionKey) &&
    (normalizedCurrent.slotKey == null || normalizedExpected.slotKey == null || normalizedExpected.slotKey === normalizedCurrent.slotKey)
  );
}

function resolveDeliveryPartition(partition: PhiSignalRuntimePartition, signal: PhiSignal) {
  return signal.scope === "site"
    ? resolvePhiSiteSignalRuntimePartition(partition)
    : partition;
}

export function canDeliverPhiSignalToReceiver(
  partition: PhiSignalRuntimePartition,
  signal: PhiSignal,
) {
  if (signal.receiver == null) {
    return false;
  }

  const deliveryPartition = resolveDeliveryPartition(partition, signal);
  if (signal.receiver === "broadcast") {
    return signal.scope !== "site";
  }

  if (
    signal.scope === "site" &&
    signal.receiver !== createPhiCoreRuntimeControllerAddress()
  ) {
    return false;
  }

  const registered = deliveryPartition.instances.get(signal.receiver);
  if (!registered) {
    return false;
  }

  return registered.scope === signal.scope &&
    registered.active !== false &&
    matchesPhiSignalRuntimeContext(registered.context, deliveryPartition.context);
}

export function resolvePhiSignalDeliveryPartition(
  partition: PhiSignalRuntimePartition,
  signal: PhiSignal,
) {
  return resolveDeliveryPartition(partition, signal);
}

export function registerPhiSignalInstance(
  partition: PhiSignalRuntimePartition,
  entry: PhiSignalRegistryEntry,
) {
  const normalizedEntry: PhiSignalRegistryEntry = {
    ...entry,
    context: normalizePhiSignalRuntimeContext(entry.context),
    active: entry.active ?? true,
  };
  partition.instances.set(entry.address, normalizedEntry);
  for (const subscriber of partition.instanceSubscribers) {
    subscriber();
  }

  return () => {
    const current = partition.instances.get(entry.address);
    if (current === normalizedEntry) {
      partition.instances.delete(entry.address);
      for (const subscriber of partition.instanceSubscribers) {
        subscriber();
      }
    }
  };
}

export function resolvePhiSignalInstance(
  partition: PhiSignalRuntimePartition,
  address: PhiSignalAddress,
) {
  return partition.instances.get(address) ?? null;
}

export function usePhiSignalInstance(address: PhiSignalAddress | null | undefined) {
  const partition = usePhiSignalRuntimePartition();
  return useSyncExternalStore(
    useCallback((subscriber) => {
      partition.instanceSubscribers.add(subscriber);
      return () => partition.instanceSubscribers.delete(subscriber);
    }, [partition]),
    useCallback(
      () => address ? resolvePhiSignalInstance(partition, address) : null,
      [address, partition],
    ),
    () => null,
  );
}

export function usePhiSignalReceiverReady(address: PhiSignalAddress | null | undefined) {
  const partition = usePhiSignalRuntimePartition();
  return useSyncExternalStore(
    useCallback((subscriber) => {
      partition.instanceSubscribers.add(subscriber);
      return () => partition.instanceSubscribers.delete(subscriber);
    }, [partition]),
    useCallback(
      () => Boolean(
        address &&
        resolvePhiSignalInstance(partition, address) &&
        (partition.receiverListenerCounts.get(address) ?? 0) > 0
      ),
      [address, partition],
    ),
    () => false,
  );
}

export function usePhiSignalInstancesReady(addresses: readonly PhiSignalAddress[]) {
  const partition = usePhiSignalRuntimePartition();
  const stableAddresses = useMemo(() => [...addresses], [addresses]);
  return useSyncExternalStore(
    useCallback((subscriber) => {
      partition.instanceSubscribers.add(subscriber);
      return () => partition.instanceSubscribers.delete(subscriber);
    }, [partition]),
    useCallback(
      () => stableAddresses.every((address) => resolvePhiSignalInstance(partition, address) != null),
      [partition, stableAddresses],
    ),
    () => false,
  );
}
