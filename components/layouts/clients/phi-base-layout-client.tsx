"use client";

import {
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  type PhiBaseLayoutSlotStates,
  type PhiBaseLayoutSlotState,
} from "../phi-layout-contract";
import {
  resolvePhiBaseLayoutSlotStates,
} from "../phi-layout-view-model";

export type { PhiBaseLayoutProps } from "../phi-layout-view-model";
import { PhiBaseLayoutSlotStateContext, type PhiBaseLayoutSlotStateContextValue } from "../phi-layout-slot-state";

export {
  PhiBaseLayoutSlotScope,
  usePhiBaseLayoutOwnSlotController,
  usePhiBaseLayoutSlotController,
  usePhiBaseLayoutSlotStates,
} from "../phi-layout-slot-state";


function usePhiBaseLayoutSlotStateContext(
  slotCount: number,
  initialSlotStates?: PhiBaseLayoutSlotStates,
) {
  const parentSlotContext = useContext(PhiBaseLayoutSlotStateContext);
  const [slotStates, setSlotStates] = useState<PhiBaseLayoutSlotState[]>(() =>
    resolvePhiBaseLayoutSlotStates(slotCount, initialSlotStates),
  );
  const resolvedSlotStates = useMemo(
    () => resolvePhiBaseLayoutSlotStates(slotCount).map((state, index) => slotStates[index] ?? state),
    [slotCount, slotStates],
  );

  const setSlotState = useCallback((slotIndex: number, nextState: PhiBaseLayoutSlotState) => {
    setSlotStates((current) => {
      const next = current.slice();
      while (next.length <= slotIndex) {
        next.push("expanded");
      }
      next[slotIndex] = nextState;
      return next;
    });
  }, []);

  const toggleSlotState = useCallback((slotIndex: number) => {
    setSlotStates((current) => {
      const next = current.slice();
      while (next.length <= slotIndex) {
        next.push("expanded");
      }
      next[slotIndex] = next[slotIndex] === "collapsed" ? "expanded" : "collapsed";
      return next;
    });
  }, []);

  return useMemo<PhiBaseLayoutSlotStateContextValue>(
    () => ({
      parent: parentSlotContext,
      slotStates: resolvedSlotStates,
      setSlotState,
      toggleSlotState,
      expandSlot: (slotIndex) => setSlotState(slotIndex, "expanded"),
      collapseSlot: (slotIndex) => setSlotState(slotIndex, "collapsed"),
      hideSlot: (slotIndex) => setSlotState(slotIndex, "hidden"),
      showSlot: (slotIndex) => setSlotState(slotIndex, "expanded"),
    }),
    [parentSlotContext, resolvedSlotStates, setSlotState, toggleSlotState],
  );
}

export function PhiBaseLayoutSlotStateProvider({
  slotCount,
  initialSlotStates,
  children,
}: {
  slotCount: number;
  initialSlotStates?: PhiBaseLayoutSlotStates;
  children: ReactNode;
}) {
  const resolvedContext = usePhiBaseLayoutSlotStateContext(slotCount, initialSlotStates);

  return (
    <PhiBaseLayoutSlotStateContext.Provider value={resolvedContext}>
      {children}
    </PhiBaseLayoutSlotStateContext.Provider>
  );
}
