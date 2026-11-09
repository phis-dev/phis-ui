"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

export type PhiSiderContextValue = {
  collapsed: boolean;
  collapsedWidth?: number | string;
};

const PhiSiderContext = createContext<PhiSiderContextValue | null>(null);

export function PhiSiderContextProvider({
  value,
  children,
}: {
  value: PhiSiderContextValue;
  children: ReactNode;
}) {
  // One object while its two fields hold, whatever object the caller wrote: the readers render for a change, not for a render.
  const held = useMemo<PhiSiderContextValue>(
    () => ({ collapsed: value.collapsed, collapsedWidth: value.collapsedWidth }),
    [value.collapsed, value.collapsedWidth],
  );
  return <PhiSiderContext.Provider value={held}>{children}</PhiSiderContext.Provider>;
}

export function usePhiSiderContext() {
  return useContext(PhiSiderContext);
}
