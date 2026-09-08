"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PHI_SIGNAL_VALUE_SCHEMAS, createPhiSignalAddress } from "../../types/signals";
import {
  usePhiSignalDispatcher,
  usePhiSignalListener,
} from "../runtime/runtime-signal-bus";
import { usePhiSignalIdentity } from "../runtime/runtime-signal-identity";
import {
  PHI_STACK_ACTIVE_SLOT_KEY_SIGNAL_CHANNEL,
  PHI_STACK_ACTIVE_SLOT_SIGNAL_CHANNEL,
  PHI_STACK_META_SIGNAL_CHANNEL,
  type PhiStackSignalSlotMeta,
} from "./stack-signals";
import { isRenderablePhiNode } from "./phi-layout-scaffold-utils";

/**
 * Which slot of a sequence is current, and how everybody else finds out.
 *
 * The second of the three layers a Stack and a Carousel share. Below it sits the viewport, which only
 * knows children and an index; above it sit the two layouts, which differ in what an index means once
 * more than one slot is visible. This is the part in between, and it is the same for both: resolve the
 * index, announce what the sequence holds, and listen for somebody moving it.
 *
 * The announcement is what makes the pager Widgets work without either layout knowing they exist. A
 * Segmented, a Select or a set of Tabs in "stack mode" reads `stackMeta` and answers with an index or
 * a key, so arrows and dots never had to live inside a layout in the first place.
 *
 * The channel is still called `stackMeta` although a Carousel is not a Stack. Renaming it would move
 * a name that sits in stored Widget configuration, and buy a better word for a data migration -- and
 * a Carousel is a Stack with a wider window anyway.
 */

/** What a layout can say about a slot before the sequence looks at the child itself. */
export type PhiSlotSequenceLabel = {
  key: string;
  label: string;
  slotIndex: number;
  hasContent?: boolean;
};

export type PhiSlotSequence = {
  /** The index the window is anchored on, already clamped to the slots that exist. */
  activeIndex: number;
  /** What the sequence holds, as the pager Widgets are told it. */
  slotMeta: PhiStackSignalSlotMeta[];
  /**
   * Move the sequence from inside -- an arrow, a dot, a timer.
   *
   * The Stack never needed this: it is driven entirely from outside, and its index is a function of
   * its configuration. A Carousel steers itself, and does it through the same state a signal writes,
   * so both routes end in one place and the next `stackMeta` reports either of them.
   */
  setActiveIndex: (index: number) => void;
};

export function clampPhiSlotIndex(index: number, slotCount: number) {
  return Math.min(Math.max(index, 0), Math.max(slotCount - 1, 0));
}

export function resolvePhiSlotIndexByKey(
  slotKeys: string[],
  activeSlotKey?: string,
  defaultActiveSlotKey?: string,
) {
  const fallbackKey = defaultActiveSlotKey ?? slotKeys[0];
  const resolvedKey = activeSlotKey ?? fallbackKey;
  const index = slotKeys.indexOf(resolvedKey ?? "");

  return index >= 0 ? index : 0;
}

export function usePhiSlotSequence({
  blockId,
  slots,
  slotKeys,
  slotLabels,
  activeSlotKey,
  defaultActiveSlotKey,
}: {
  // Whatever the layout was given: the address is built from it, and a sequence without one is
  // simply not addressable and stays where its configuration puts it.
  blockId: string | number | null | undefined;
  slots: ReactNode[];
  slotKeys: string[];
  slotLabels?: readonly PhiSlotSequenceLabel[];
  activeSlotKey?: string;
  defaultActiveSlotKey?: string;
}): PhiSlotSequence {
  const dispatchSignal = usePhiSignalDispatcher();
  const signalIdentity = usePhiSignalIdentity();
  const signalScope = signalIdentity.scope ?? "page";
  const signalAddress = blockId == null ? null : createPhiSignalAddress("cms", blockId);

  const configuredIndex = resolvePhiSlotIndexByKey(slotKeys, activeSlotKey, defaultActiveSlotKey);
  /*
   * Held against the address it was set for. A sequence that is moved and then re-mounted somewhere
   * else must not inherit a position that was never about it.
   */
  const [steeredSlot, setSteeredSlot] = useState<{ key?: string; index: number } | null>(null);
  const currentIndex = steeredSlot && steeredSlot.key === signalAddress
    ? steeredSlot.index
    : configuredIndex;

  const slotMeta = useMemo<PhiStackSignalSlotMeta[]>(
    () => slotKeys.map((key, index) => {
      const declared = slotLabels?.find(
        (candidate) => candidate.slotIndex === index || candidate.key === key,
      );
      const child = slots[index] ?? null;

      return {
        index,
        key,
        label: declared?.label?.trim() || key,
        hasContent: declared?.hasContent ?? isRenderablePhiNode(child),
      };
    }),
    [slotKeys, slotLabels, slots],
  );

  /*
   * `correlationId` is the id of the request being answered, and absent when the sequence publishes
   * because its own state changed. Both are correct: an answer belongs to the exchange that asked for
   * it, an unprompted announcement begins one.
   */
  const publishSlotMeta = useCallback((correlationId?: string) => {
    if (!signalAddress) {
      return;
    }

    dispatchSignal({
      scope: signalScope,
      channel: PHI_STACK_META_SIGNAL_CHANNEL,
      action: "change",
      value: {
        activeSlotIndex: clampPhiSlotIndex(currentIndex, slots.length),
        slots: slotMeta,
      },
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta,
      sender: signalAddress,
      receiver: "broadcast",
      correlationId,
    });
  }, [currentIndex, dispatchSignal, signalAddress, signalScope, slotMeta, slots.length]);

  usePhiSignalListener(
    (signal) => {
      if (!signalAddress || signal.receiver !== signalAddress) {
        return;
      }

      if (signal.channel === PHI_STACK_ACTIVE_SLOT_SIGNAL_CHANNEL && signal.action === "change") {
        if (typeof signal.value !== "number") {
          return;
        }
        setSteeredSlot({
          key: signalAddress,
          index: clampPhiSlotIndex(signal.value, slots.length),
        });
        return;
      }

      if (signal.channel === PHI_STACK_ACTIVE_SLOT_KEY_SIGNAL_CHANNEL && signal.action === "change") {
        const nextIndex = typeof signal.value === "string" ? slotKeys.indexOf(signal.value) : -1;
        if (nextIndex < 0) {
          return;
        }
        setSteeredSlot({ key: signalAddress, index: nextIndex });
        return;
      }

      if (signal.channel === PHI_STACK_META_SIGNAL_CHANNEL && signal.action === "activate") {
        publishSlotMeta(signal.correlationId);
      }
    },
    useMemo(
      () => ({
        scopes: [signalScope],
        channels: [
          PHI_STACK_META_SIGNAL_CHANNEL,
          PHI_STACK_ACTIVE_SLOT_SIGNAL_CHANNEL,
          PHI_STACK_ACTIVE_SLOT_KEY_SIGNAL_CHANNEL,
        ],
      }),
      [signalScope],
    ),
    /*
     * The address this sequence answers to, declared so the bus knows it has arrived.
     *
     * A signal aimed at a receiver whose instance is registered but which nothing is listening for is
     * held rather than dropped -- an Overlay body mounts on first open, so the click that opens it
     * addresses a Widget that will not exist for another render. A sequence subscribes by scope and
     * channel, which tells the bus nothing about the address it is, so every command aimed at it
     * waited for a listener that, from the bus's side, never showed up.
     */
    signalAddress,
  );

  useEffect(() => {
    publishSlotMeta();
  }, [publishSlotMeta]);

  const setActiveIndex = useCallback((index: number) => {
    setSteeredSlot({
      ...(signalAddress ? { key: signalAddress } : {}),
      index: clampPhiSlotIndex(index, slots.length),
    });
  }, [signalAddress, slots.length]);

  return {
    activeIndex: clampPhiSlotIndex(currentIndex, slots.length),
    slotMeta,
    setActiveIndex,
  };
}
