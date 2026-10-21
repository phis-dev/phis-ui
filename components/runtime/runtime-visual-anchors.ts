"use client";

import { useCallback, useEffect, useRef } from "react";

import { PHI_VISUAL_ANCHOR_PART_ATTRIBUTE, type PhiVisualAnchorAddress } from "../../types/tours";
import { usePhiSignalRuntimePartition, type PhiSignalRuntimePartition } from "./runtime-signal-partition";

/*
 * Next replaces `process.env.NODE_ENV` with a constant, so the duplicate report below falls out of a
 * production build. Declared here, as in the partition, for a Module package without Node types.
 */
declare const process: { env: { NODE_ENV?: string } };


/**
 * One registration. The element is reached through a getter rather than held as a value, so whoever reads
 * it always gets the element as it is now -- and nothing about it can end up in a signal, a snapshot or a
 * response, which only ever carry the address.
 */
export type PhiVisualAnchorEntry = {
  address: PhiVisualAnchorAddress;
  getElement: () => HTMLElement | null;
};

function notify(partition: PhiSignalRuntimePartition) {
  for (const subscriber of partition.visualAnchorSubscribers) {
    subscriber();
  }
}

/**
 * Registers one element for an address. Two live elements under one address are a contract error: the
 * address then resolves to neither until one of them is gone, rather than to whichever mounted last.
 */
export function registerPhiVisualAnchor(partition: PhiSignalRuntimePartition, entry: PhiVisualAnchorEntry) {
  const byAddress = partition.visualAnchors;
  const entries = [...(byAddress.get(entry.address) ?? []), entry];
  byAddress.set(entry.address, entries);
  if (entries.length > 1 && process.env.NODE_ENV === "development") {
    console.error(
      `[phi-visual-anchor] ${entries.length} live elements for "${entry.address}" in partition "${partition.id}"; `
        + "the address resolves to none of them until only one is left.",
    );
  }
  notify(partition);

  return () => {
    const remaining = (byAddress.get(entry.address) ?? []).filter((candidate) => candidate !== entry);
    if (remaining.length > 0) {
      byAddress.set(entry.address, remaining);
    } else {
      byAddress.delete(entry.address);
    }
    notify(partition);
  };
}

/**
 * The element an address is drawn as, in this partition and nowhere else, or `null` when it is not there
 * to point at: not mounted, mounted twice, detached, rendered without a box (hidden, `display: none`), or
 * with a box of no area -- a slot that hides itself because it has nothing to show still lays out at zero
 * height, and a Tour pointing at it pointed at nothing.
 */
export function readPhiVisualAnchor(partition: PhiSignalRuntimePartition, address: PhiVisualAnchorAddress) {
  const entries = partition.visualAnchors.get(address);
  const element = entries?.length === 1 ? entries[0]!.getElement() : null;
  if (!element || !element.isConnected || element.getClientRects().length === 0) {
    return null;
  }
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 ? element : null;
}

/** How often a wait looks again for a target that is registered but not yet laid out. */
const WAIT_POLL_INTERVAL_MS = 100;

/**
 * Waits until the address can be pointed at, for at most `timeoutMs`, and answers `null` when it could
 * not -- never a neighbour. Registration is watched; becoming visible is not an event anybody sends, so
 * a registered but hidden target is looked at again on a short interval until the wait ends.
 */
export function waitForPhiVisualAnchor(
  partition: PhiSignalRuntimePartition,
  address: PhiVisualAnchorAddress,
  { timeoutMs, signal }: { timeoutMs: number; signal?: AbortSignal },
): Promise<HTMLElement | null> {
  const ready = readPhiVisualAnchor(partition, address);
  if (ready || signal?.aborted) {
    return Promise.resolve(ready);
  }

  return new Promise((resolve) => {
    const check = () => {
      const element = readPhiVisualAnchor(partition, address);
      if (element) {
        finish(element);
      }
    };
    const finish = (element: HTMLElement | null) => {
      partition.visualAnchorSubscribers.delete(check);
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      resolve(element);
    };
    const abort = () => finish(null);
    partition.visualAnchorSubscribers.add(check);
    const interval = window.setInterval(check, WAIT_POLL_INTERVAL_MS);
    const timeout = window.setTimeout(abort, timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
  });
}

/**
 * How many frames in a row a target has to stand still before it counts as placed. More than two: an
 * opening slot or Drawer often holds still for a frame or two before its motion starts, and measured
 * then, the pointer is fixed to where it started.
 */
const SETTLE_STILL_FRAMES = 8;

/**
 * Waits until a found target stops moving -- a Drawer sliding in, a slot opening -- and answers whether it
 * did before `timeoutMs`. Whoever points at a target measures it once: measured mid-motion, the pointer
 * stays where the target was on its way, off screen for a Drawer that is still coming in.
 */
export function waitForPhiVisualAnchorToSettle(
  element: HTMLElement,
  { timeoutMs, signal }: { timeoutMs: number; signal?: AbortSignal },
): Promise<boolean> {
  return new Promise((resolve) => {
    let last = "";
    let still = 0;
    let frame = 0;
    const finish = (settled: boolean) => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      resolve(settled);
    };
    const abort = () => finish(false);
    const look = () => {
      const box = element.getBoundingClientRect();
      const next = `${box.x},${box.y},${box.width},${box.height}`;
      still = next === last ? still + 1 : 0;
      last = next;
      if (still >= SETTLE_STILL_FRAMES) {
        finish(true);
        return;
      }
      frame = window.requestAnimationFrame(look);
    };
    const timeout = window.setTimeout(() => finish(false), timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) {
      finish(false);
      return;
    }
    frame = window.requestAnimationFrame(look);
  });
}

/**
 * Registers the element a ref lands on as the visual anchor of `address` in the surrounding partition.
 *
 * Returns a callback ref. `null` as the address registers nothing -- a frame without an instance id has no
 * address to be found by.
 */
export function usePhiVisualAnchor<T extends HTMLElement>(address: PhiVisualAnchorAddress | null) {
  const partition = usePhiSignalRuntimePartition();
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    if (!address) {
      return undefined;
    }
    return registerPhiVisualAnchor(partition, { address, getElement: () => elementRef.current });
  }, [address, partition]);

  return useCallback((element: T | null) => {
    elementRef.current = element;
  }, []);
}

/**
 * Registers the parts a Widget offers as `<address>:<part>`, each found inside the Widget's own frame by
 * the mark its Control draws it with (`PHI_VISUAL_ANCHOR_PART_ATTRIBUTE`).
 *
 * Looked up when asked rather than held: a Table's pagination comes and goes with its rows, and its header
 * row is drawn by Ant Design, which hands out no ref. Only inside the frame of `address`, so a part of
 * another Widget -- or of a dialog, which is drawn elsewhere -- is never found in its place.
 */
export function registerPhiVisualAnchorParts(
  partition: PhiSignalRuntimePartition,
  address: PhiVisualAnchorAddress,
  parts: readonly string[],
) {
  const removals = parts.map((part) => registerPhiVisualAnchor(partition, {
    address: `${address}:${part}` as PhiVisualAnchorAddress,
    getElement: () => readPhiVisualAnchor(partition, address)
      ?.querySelector<HTMLElement>(`[${PHI_VISUAL_ANCHOR_PART_ATTRIBUTE}="${part}"]`) ?? null,
  }));
  return () => {
    for (const remove of removals) {
      remove();
    }
  };
}

/** `registerPhiVisualAnchorParts` for as long as the Widget is mounted; `null` registers nothing. */
export function usePhiVisualAnchorParts(address: PhiVisualAnchorAddress | null, parts: readonly string[]) {
  const partition = usePhiSignalRuntimePartition();
  const partsKey = parts.join(",");

  useEffect(() => {
    if (!address || !partsKey) {
      return undefined;
    }
    return registerPhiVisualAnchorParts(partition, address, partsKey.split(","));
  }, [address, partition, partsKey]);
}
