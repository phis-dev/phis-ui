"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { PhiBaseLayoutSlotState } from "./phi-layout-contract";

/*
 * The slot state a layout shares with what it renders.
 *
 * Kept apart from the layout Render-Clients so that a Widget rendered inside a slot -- an Inspector
 * section that hides its own panel when it has nothing to show -- can reach the slot without importing
 * a Render-Client, which the Render-Client boundary forbids outside `components/layouts/clients/`.
 */

export type PhiBaseLayoutSlotStateContextValue = {
  parent: PhiBaseLayoutSlotStateContextValue | null;
  slotStates: PhiBaseLayoutSlotState[];
  setSlotState: (slotIndex: number, nextState: PhiBaseLayoutSlotState) => void;
  toggleSlotState: (slotIndex: number) => void;
  expandSlot: (slotIndex: number) => void;
  collapseSlot: (slotIndex: number) => void;
  hideSlot: (slotIndex: number) => void;
  showSlot: (slotIndex: number) => void;
};

export const PhiBaseLayoutSlotStateContext = createContext<PhiBaseLayoutSlotStateContextValue | null>(null);

/*
 * The slot a child is rendered in. A layout that wants its children to be able to steer their own
 * slot -- hide it when they have nothing to show -- wraps each slot's content in `PhiBaseLayoutSlotScope`.
 * Without the scope, `usePhiBaseLayoutOwnSlotController` answers null and a child changes nothing.
 */
const PhiBaseLayoutSlotIndexContext = createContext<number | null>(null);

export function PhiBaseLayoutSlotScope({ slotIndex, children }: { slotIndex: number; children: ReactNode }) {
  return (
    <PhiBaseLayoutSlotIndexContext.Provider value={slotIndex}>{children}</PhiBaseLayoutSlotIndexContext.Provider>
  );
}

function resolvePhiBaseLayoutAncestorContext(
  context: PhiBaseLayoutSlotStateContextValue | null,
  ancestorLevel: number,
) {
  let current = context;
  let remaining = ancestorLevel;

  while (current && remaining > 0) {
    current = current.parent;
    remaining -= 1;
  }

  return current;
}

export function usePhiBaseLayoutSlotState(slotIndex: number, ancestorLevel = 0) {
  const context = useContext(PhiBaseLayoutSlotStateContext);
  const targetContext = resolvePhiBaseLayoutAncestorContext(context, ancestorLevel);
  if (!targetContext) {
    return null;
  }

  return targetContext.slotStates[slotIndex] ?? "expanded";
}

export function usePhiBaseLayoutSlotStates(ancestorLevel = 0) {
  const context = useContext(PhiBaseLayoutSlotStateContext);
  const targetContext = resolvePhiBaseLayoutAncestorContext(context, ancestorLevel);
  if (!targetContext) {
    return null;
  }

  return targetContext.slotStates;
}

/**
 * The controller of the slot this component is rendered in, or null outside a layout that scopes its
 * slots. What a child does with it is the child's decision; the layout only owns the state.
 */
export function usePhiBaseLayoutOwnSlotController() {
  const slotIndex = useContext(PhiBaseLayoutSlotIndexContext);
  const controller = usePhiBaseLayoutSlotController(slotIndex ?? -1);
  return slotIndex == null ? null : controller;
}

export function usePhiBaseLayoutSlotController(slotIndex: number, ancestorLevel = 0) {
  const context = useContext(PhiBaseLayoutSlotStateContext);
  const targetContext = resolvePhiBaseLayoutAncestorContext(context, ancestorLevel);
  const state = targetContext?.slotStates[slotIndex] ?? "expanded";

  return useMemo(
    () =>
      targetContext
        ? {
            state,
            setState: (nextState: PhiBaseLayoutSlotState) => targetContext.setSlotState(slotIndex, nextState),
            toggle: () => targetContext.toggleSlotState(slotIndex),
            expand: () => targetContext.expandSlot(slotIndex),
            collapse: () => targetContext.collapseSlot(slotIndex),
            hide: () => targetContext.hideSlot(slotIndex),
            show: () => targetContext.showSlot(slotIndex),
          }
        : null,
    [targetContext, slotIndex, state],
  );
}
